import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { removeAuthToken, getActiveBranch, removeActiveBranch, saveActiveBranch } from "../../../services/auth";
import { API_BASE_URL } from "../../../config/api";
import { generateRegistrationId } from "../../../utils/idGenerator";
import AnalogClockPicker from "../../../components/AnalogClockPicker";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

// Dynamic Doctor Color Palette
const DOCTOR_COLORS = ["#0284c7", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];

export const DEFAULT_CLINIC_DOCTORS: DoctorOption[] = [];

export interface DoctorOption {
  id: string;
  doctorId: string;
  name: string;
  specialty?: string;
  phone?: string;
  color: string;
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
  rawRangeText: string;
  slots: GeneratedSlot[];
  suggestedBeforeTime: string;
  suggestedAfterTime: string;
}

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

export default function ReceptionBookAppointmentScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<any>(null);

  // --- REBACK / SEARCH STATES ---
  const [isRebackMode, setIsRebackMode] = useState(false);
  const [manualRegId, setManualRegId] = useState("");
  const [isCheckingRegId, setIsCheckingRegId] = useState(false);
  const [foundProfile, setFoundProfile] = useState<PatientSuggestion | null>(null);

  // --- FORM FIELDS ---
  const [patientName, setPatientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [diseases, setDiseases] = useState("");
  const [marketingSource, setMarketingSource] = useState("");
  const [consultationMode, setConsultationMode] = useState("");

  // Search suggestions
  const [patientSuggestions, setPatientSuggestions] = useState<PatientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- APPOINTMENT DETAILS ---
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${d}-${m}-${y}`;
  });
  const [availableDoctors, setAvailableDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [activeNoShows, setActiveNoShows] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [temporarySlots, setTemporarySlots] = useState<Array<{ time: string; sessionIndex?: number } | string>>([]);
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);

  // Profiles Modal States (Check Profiles, 10-Digit Auto-Popup, Edit, Merge, Delete)
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);
  const [phoneProfiles, setPhoneProfiles] = useState<any[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [editingProfileRegId, setEditingProfileRegId] = useState<string | null>(null);
  const [editingNameVal, setEditingNameVal] = useState("");
  const [mergingSourceProfile, setMergingSourceProfile] = useState<any | null>(null);
  const [mergingTargetRegId, setMergingTargetRegId] = useState("");
  const [modalSearchInput, setModalSearchInput] = useState("");

  // Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<any>(null);

  // Inline Dropdown States (Directly below fields, no modal popups)
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [branchesList, setBranchesList] = useState<string[]>([
    "KPHB Branch",
    "Chandanagar Branch",
    "Dilshuknagar Branch",
    "Nallagandla Branch",
  ]);

  // Calendar Modal State
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // Drawer Animation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentBranchName = activeBranch?.name || "KPHB Branch";

  const handleSelectBranch = (bName: string) => {
    const newBranch = { name: bName };
    setActiveBranch(newBranch);
    saveActiveBranch(newBranch);
    setSelectedDoctor(null);
    setSelectedSlot("");
    setIsBranchOpen(false);
  };

  // Helper to extract day abbreviation (Mon, Tue, Wed, etc.) from YYYY-MM-DD or DD-MM-YYYY
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

  // Helper to parse time string like "12:30 PM", "10:00AM", "10 AM" to minutes
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

  // Fetch real doctors and no-shows from API for this branch and date
  const fetchDoctorsAndNoShows = async (bName: string, dt: string, modeOverride?: string) => {
    try {
      setLoadingDoctors(true);
      const isOnline = (modeOverride !== undefined ? modeOverride : consultationMode) === "Online";

      if (isOnline) {
        // Online Mode: Fetch ALL clinic doctors across all branches
        const res = await fetch(`${API_BASE_URL}/admin/employees?category=DOCTOR`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.employees)) {
            const mapped: DoctorOption[] = data.employees.map((d: any, idx: number) => ({
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
      }

      const day = getDayOfWeekAbbr(dt);
      const cleanBranch = bName.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

      const [timingsRes, noShowRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/doctor-timings?branch=${encodeURIComponent(cleanBranch)}&day=${day}`),
        fetch(`${API_BASE_URL}/reception/doctor-no-show?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dt)}`),
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
    } catch (err) {
      console.warn("Failed to fetch doctors:", err);
      setAvailableDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b && b.name) {
        setActiveBranch(b);
        setBranchesList([b.name]);
        fetchDoctorsAndNoShows(b.name, appointmentDate);
      } else {
        fetch(`${API_BASE_URL}/branches`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
              const def = data.data[0].name;
              setActiveBranch({ name: def });
              setBranchesList([def]);
              fetchDoctorsAndNoShows(def, appointmentDate);
            }
          })
          .catch(() => {
            const def = "KPHB Branch";
            setActiveBranch({ name: def });
            setBranchesList([def]);
            fetchDoctorsAndNoShows(def, appointmentDate);
          });
      }
    });
  }, []);

  useEffect(() => {
    const bName = activeBranch?.name || "KPHB Branch";
    fetchDoctorsAndNoShows(bName, appointmentDate, consultationMode);
    setSelectedSlot("");
  }, [appointmentDate, activeBranch, consultationMode]);

  // Fetch temporary slots and existing appointments count for this branch, doctor, and date
  useEffect(() => {
    const bName = activeBranch?.name || "KPHB Branch";
    if (bName && selectedDoctor && appointmentDate) {
      const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
      fetch(
        `${API_BASE_URL}/reception/temporary-slots?branch=${encodeURIComponent(bName)}&doctorId=${encodeURIComponent(docId)}&date=${encodeURIComponent(appointmentDate)}`
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
        `${API_BASE_URL}/reception/appointments?branch=${encodeURIComponent(bName)}&date=${encodeURIComponent(appointmentDate)}&doctorId=${encodeURIComponent(docId)}`
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
  }, [activeBranch, selectedDoctor, appointmentDate]);

  // Filter for available-only doctors (exclude full-day no-shows / leaves)
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

  // Dynamic 15-Minute Slot Generation split into Sessions (Admin Timings + Multi-Shift + Resilient Fallbacks)
  const slotSessions = useMemo((): SlotSession[] => {
    if (!selectedDoctor) return [];
    let ranges = selectedDoctor.slots || [];

    // Fallback if doctor is selected but slots array is empty
    if (ranges.length === 0) {
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

    // Find if selected doctor has active no-show on this branch & date
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
    const bName = activeBranch?.name || "KPHB Branch";
    if (!selectedDoctor || !bName || !appointmentDate || !slotTime) return;
    const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
    try {
      const res = await fetch(`${API_BASE_URL}/reception/temporary-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: bName,
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
    const bName = activeBranch?.name || "KPHB Branch";
    if (!selectedDoctor || !bName || !appointmentDate) return;
    const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
    try {
      const res = await fetch(`${API_BASE_URL}/reception/temporary-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: bName,
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
        const cleanB = currentBranchName.replace(/Spiritual Homeopathy/gi, "").trim();
        const res = await fetch(`${API_BASE_URL}/reception/patients?query=${encodeURIComponent(text.trim())}&branch=${encodeURIComponent(cleanB)}`);
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
    setShowSuggestions(false);
  };

  // Reback Registration ID Lookup
  const handleManualProfileLookup = async (idToTest: string) => {
    const cleanId = idToTest.trim().toUpperCase();
    if (!cleanId || cleanId.length < 3) return;

    setIsCheckingRegId(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reception/patients?regId=${encodeURIComponent(cleanId)}`);
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
        } else {
          setFoundProfile(null);
        }
      }
    } catch (err) {
      console.warn("Profile lookup error:", err);
      setFoundProfile(null);
    } finally {
      setIsCheckingRegId(false);
    }
  };

  // Profiles Multi-Account Helpers (Check Profiles, 10-Digit Auto-Popup, Edit Name, Merge, Delete)
  const fetchAndOpenProfiles = async (phoneOrQuery: string, autoOpen = true) => {
    const raw = phoneOrQuery.trim();
    if (!raw) return;
    setIsLoadingProfiles(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reception/patients/by-phone?query=${encodeURIComponent(raw)}`);
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
      console.warn("Failed to fetch phone profiles:", err);
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
      const clean = profile.phone.replace(/\D/g, "").slice(-10);
      setPhoneNumber(clean);
      setModalSearchInput(clean);
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
      const res = await fetch(`${API_BASE_URL}/reception/patients/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_NAME", regId, newName: editingNameVal.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Profile name updated successfully!");
        setEditingProfileRegId(null);
        if (foundProfile && foundProfile.regId === regId) {
          setPatientName(editingNameVal.trim());
        }
        fetchAndOpenProfiles(phoneNumber, false);
      } else {
        Alert.alert("Error", data.error || "Failed to update name.");
      }
    } catch {
      Alert.alert("Error", "Network error updating name.");
    }
  };

  const handleDeleteProfile = async (regId: string, name: string) => {
    Alert.alert(
      "Confirm Delete",
      `Delete profile for "${name}" (${regId})? It will be archived in Admin trash for 30 days and can be restored. Its ID sequence remains reserved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/reception/patients/manage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "DELETE", regId }),
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert("Success", `Profile "${name}" deleted and moved to 30-day trash.`);
                if (foundProfile && foundProfile.regId === regId) {
                  handleCreateNewProfileForNumber();
                }
                fetchAndOpenProfiles(phoneNumber, false);
              } else {
                Alert.alert("Error", data.error || "Failed to delete profile.");
              }
            } catch {
              Alert.alert("Error", "Network error deleting profile.");
            }
          },
        },
      ]
    );
  };

  const handleExecuteMerge = async () => {
    if (!mergingSourceProfile || !mergingTargetRegId) return;
    Alert.alert(
      "Confirm Merge",
      `Merge "${mergingSourceProfile.name}" (${mergingSourceProfile.regId}) into (${mergingTargetRegId})? All clinical history and appointments will transfer to (${mergingTargetRegId}), and (${mergingSourceProfile.regId}) will be disabled.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Merge",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/reception/patients/manage`, {
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
                Alert.alert("Success", `Merged successfully! ${data.mergedCount} appointments transferred to ${mergingTargetRegId}.`);
                setMergingSourceProfile(null);
                setMergingTargetRegId("");
                fetchAndOpenProfiles(phoneNumber, false);
              } else {
                Alert.alert("Error", data.error || "Failed to merge profiles.");
              }
            } catch {
              Alert.alert("Error", "Network error merging profiles.");
            }
          },
        },
      ]
    );
  };

  const handleClearForm = () => {
    setPatientName("");
    setPhoneNumber("");
    setDiseases("");
    setManualRegId("");
    setFoundProfile(null);
    setPatientSuggestions([]);
    setSelectedSlot("");
  };

  // Appointment Submission
  const handleBookingSubmit = async () => {
    if (!patientName.trim()) {
      Alert.alert("Required Field", "Please enter patient name.");
      return;
    }
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert("Required Field", "Please enter a valid 10-digit phone number.");
      return;
    }
    if (!consultationMode) {
      Alert.alert("Required Field", "Please select consultation mode.");
      return;
    }
    if (!marketingSource) {
      Alert.alert("Required Field", "Please select patient source.");
      return;
    }
    if (!selectedDoctor) {
      Alert.alert("Doctor Required", "Please select a consulting doctor.");
      return;
    }
    if (!selectedSlot) {
      Alert.alert(
        "Time Required",
        consultationMode === "Online"
          ? "Please select a consultation time on the clock."
          : "Please select an available consultation slot."
      );
      return;
    }

    if (isDateInPast(appointmentDate)) {
      Alert.alert("Invalid Date", "Cannot book appointments for past dates. For historical records, please use Old Patient RX.");
      return;
    }

    if (isSlotTimePassed(selectedSlot, appointmentDate)) {
      Alert.alert("Invalid Slot", `Time slot ${selectedSlot} has already passed for today. Please select an upcoming consultation time slot.`);
      return;
    }

    // Check if doctor is on full day no-show
    const isDocFullDayOff = activeNoShows.some(
      (ns) =>
        (ns.doctorId === selectedDoctor.id || ns.doctorName === selectedDoctor.name) &&
        ns.type === "FULL_DAY"
    );
    if (isDocFullDayOff) {
      Alert.alert("Doctor Unavailable", `${selectedDoctor.name} is marked on leave/no-show on ${appointmentDate}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalRegId = isRebackMode && manualRegId.trim()
        ? manualRegId.trim().toUpperCase()
        : await generateRegistrationId(currentBranchName, API_BASE_URL);

      const payload = {
        registrationId: finalRegId,
        patientName: patientName.trim(),
        phoneNumber: cleanPhone.slice(-10),
        diseases: diseases.trim() || undefined,
        marketingSource,
        consultationMode,
        selectedDoctor: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        appointmentDate,
        selectedTimeSlot: selectedSlot,
        branch: currentBranchName,
        isReback: isRebackMode,
      };

      const res = await fetch(`${API_BASE_URL}/reception/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookedDetails({
          token: data.appointment?.token || `SPH-${Math.floor(10 + Math.random() * 90)}`,
          regId: finalRegId,
          name: patientName.trim(),
          phone: cleanPhone.slice(-10),
          doctor: selectedDoctor.name,
          date: appointmentDate,
          time: selectedSlot,
          mode: consultationMode,
        });
        setShowSuccessModal(true);
        handleClearForm();

        // Refresh booked appointments list to update slot capacities immediately
        const bName = activeBranch?.name || "KPHB Branch";
        const docId = selectedDoctor.id || selectedDoctor.doctorId || "";
        fetch(
          `${API_BASE_URL}/reception/appointments?branch=${encodeURIComponent(bName)}&date=${encodeURIComponent(appointmentDate)}&doctorId=${encodeURIComponent(docId)}`
        )
          .then((r) => r.json())
          .then((d) => {
            if (d.success && Array.isArray(d.appointments)) {
              setBookedAppointments(d.appointments);
            }
          })
          .catch(() => { });
      } else {
        Alert.alert("Error", data.error || "Failed to book appointment.");
      }
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed to communicate with the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar Helpers
  const daysInMonth = useMemo(() => {
    return new Date(calYear, calMonth + 1, 0).getDate();
  }, [calYear, calMonth]);

  const firstDayOffset = useMemo(() => {
    return new Date(calYear, calMonth, 1).getDay();
  }, [calYear, calMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Drawer handlers
  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setIsDrawerOpen(false));
  };

  const handleNavigate = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(reception)" as any);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [router]);

  const handleLogout = async () => {
    closeDrawer();
    await removeAuthToken();
    await removeActiveBranch();
    router.replace("/(auth)/login");
  };

  const navMenuItems = [
    { id: "dashboard", title: "Dashboard", icon: "grid-outline", route: "/(reception)" },
    { id: "appointments", title: "Appointments", icon: "calendar-outline", route: "/(reception)/appointments" },
    { id: "all-patients", title: "All Patients List", icon: "people-outline", route: "/(reception)/all-patients" },
    { id: "follow-ups", title: "Follow-ups", icon: "call-outline", route: "/(reception)/follow-ups" },
    { id: "doctor-no-show", title: "Doctor No-Show", icon: "person-remove-outline", route: "/(reception)/doctor-no-show" },
    { id: "branch-cleaning", title: "Branch Cleaning", icon: "sparkles-outline", route: "/(reception)/branch-cleaning" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* TOP HEADER */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Appointment</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 14, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* CARD 1: PATIENT DETAILS */}
          <View style={[styles.card, { zIndex: isModeOpen ? 90 : 1 }]}>
            {/* CARD 1 HEADER ROW (TITLE ON LEFT, CLEAR ON COMPLETE RIGHT) */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.badgeCircle}>
                  <Text style={styles.badgeText}>1</Text>
                </View>
                <Text style={styles.cardTitle}>Patient Details</Text>
              </View>

              {/* CLEAR BUTTON IN COMPLETE RIGHT POSITION */}
              {patientName || phoneNumber || manualRegId || diseases ? (
                <TouchableOpacity onPress={handleClearForm} style={styles.clearBtn}>
                  <Ionicons name="trash-outline" size={12} color="#dc2626" />
                  <Text style={styles.clearBtnText}>Clear Form</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* PATIENT NAME & AUTOCOMPLETE SUGGESTIONS */}
            <View style={{ marginBottom: 14, position: "relative", zIndex: 100 }}>
              <Text style={styles.label}>Patient Full Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter patient full name"
                  placeholderTextColor="#94a3b8"
                  value={patientName}
                  onChangeText={handlePatientNameChange}
                />
              </View>

              {/* SUGGESTIONS DROPDOWN (PATIENT AUTOCOMPLETE) */}
              {showSuggestions && patientSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  <View style={styles.suggestionsHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.suggestionsHeaderText}>MATCHING PATIENTS</Text>
                      <View style={styles.suggestionsCountBadge}>
                        <Text style={styles.suggestionsCountText}>{patientSuggestions.length}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowSuggestions(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {patientSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelectSuggestion(item)}
                      style={styles.suggestionItem}
                    >
                      <View style={styles.suggestionAvatar}>
                        <Text style={styles.suggestionAvatarText}>
                          {item.name.trim().charAt(0).toUpperCase() || "P"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "800", color: "#0f172a", fontSize: 13 }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                          📞 {item.phone} {item.diseases ? `• ${item.diseases}` : ""}
                        </Text>
                      </View>
                      <View style={styles.suggestionRegIdBadge}>
                        <Text style={styles.suggestionRegIdText}>{item.regId}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* PHONE NUMBER & DISEASES / SYMPTOMS (SIDE BY SIDE UNDER ONE LINE) */}
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
              {/* PHONE (+91) */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={[styles.label, { marginBottom: 0, fontSize: 11 }]} numberOfLines={1}>Phone *</Text>
                  <TouchableOpacity
                    onPress={handleCheckProfiles}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      backgroundColor: "#f0f9ff",
                      borderWidth: 1,
                      borderColor: "#bae6fd",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Ionicons name="people" size={11} color="#0284c7" />
                    <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#0284c7" }}>Profiles</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={15} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                  />
                </View>
              </View>

              {/* DISEASES / SYMPTOMS */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginBottom: 6, fontSize: 11 }]} numberOfLines={1}>Diseases / Symptoms</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="medical-outline" size={15} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Complaints / disease"
                    placeholderTextColor="#94a3b8"
                    value={diseases}
                    onChangeText={setDiseases}
                  />
                </View>
              </View>
            </View>

            {/* CONSULTATION MODE & PATIENT SOURCE DROPDOWNS (SIDE BY SIDE) */}
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 0, zIndex: 50 }}>
              {/* CONSULTATION MODE */}
              <View style={{ flex: 1, position: "relative", zIndex: isModeOpen ? 60 : 5 }}>
                <Text style={styles.label} numberOfLines={1}>Consultation Mode *</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    isModeOpen && styles.dropdownTriggerActive,
                  ]}
                  onPress={() => {
                    setIsModeOpen(!isModeOpen);
                    setIsBranchOpen(false);
                    setIsSourceOpen(false);
                    setIsDoctorOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !consultationMode && { color: "#94a3b8", fontWeight: "500" },
                      { flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {consultationMode
                      ? CONSULTATION_MODES.find((m) => m.id === consultationMode)?.label || consultationMode
                      : "Select mode"}
                  </Text>
                  <Feather name={isModeOpen ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
                </TouchableOpacity>

                {/* INLINE DROPDOWN BELOW FIELD */}
                {isModeOpen && (
                  <View style={styles.inlineDropdownMenu}>
                    {CONSULTATION_MODES.map((mode) => {
                      const selected = consultationMode === mode.id;
                      return (
                        <TouchableOpacity
                          key={mode.id}
                          style={[styles.inlineDropdownItem, selected && styles.inlineDropdownItemSelected]}
                          onPress={() => {
                            setConsultationMode(mode.id);
                            setSelectedDoctor(null);
                            setSelectedSlot("");
                            setIsModeOpen(false);
                            const bName = activeBranch?.name || "KPHB Branch";
                            fetchDoctorsAndNoShows(bName, appointmentDate, mode.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.inlineDropdownText,
                              selected && { color: "#0284c7", fontWeight: "800" },
                              { flex: 1 },
                            ]}
                            numberOfLines={1}
                          >
                            {mode.label}
                          </Text>
                          <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                            {selected && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* PATIENT SOURCE */}
              <View style={{ flex: 1, position: "relative" }}>
                <Text style={styles.label} numberOfLines={1}>Patient Source *</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    isSourceOpen && styles.dropdownTriggerActive,
                  ]}
                  onPress={() => {
                    setIsSourceOpen(true);
                    setIsBranchOpen(false);
                    setIsModeOpen(false);
                    setIsDoctorOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !marketingSource && { color: "#94a3b8", fontWeight: "500" },
                      { flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {marketingSource || "Select source"}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* CARD 2: APPOINTMENT DETAILS */}
          <View style={[styles.card, { zIndex: (isBranchOpen || isDoctorOpen) ? 80 : 1 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.badgeCircle}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
                <Text style={styles.cardTitle}>Appointment Details</Text>
              </View>
            </View>

            {/* CLINIC BRANCH (STRICTLY LOCKED TO RECEPTION'S ASSIGNED CLINIC) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Clinic Branch *</Text>
              <View
                style={[
                  styles.doctorDropdownTrigger,
                  { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
                ]}
              >
                <Feather name="lock" size={14} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#0f172a", flex: 1 }}>
                  {currentBranchName}
                </Text>
                <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "900", color: "#0284c7" }}>LOCKED</Text>
                </View>
              </View>
            </View>

            {/* DATE SELECTOR BUTTON (OPENS CALENDAR) */}
            <Text style={styles.label}>Select Appointment Date *</Text>
            <TouchableOpacity
              onPress={() => setCalendarModalOpen(true)}
              style={styles.dateSelectorBtn}
            >
              <Text style={{ fontWeight: "800", color: "#0f172a", fontSize: 14, flex: 1 }}>
                {appointmentDate}
              </Text>
              <Feather name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            {/* DOCTOR DROPDOWN (AVAILABLE ONLY - DIRECTLY BELOW FIELD, DR NAME ONLY) */}
            <View style={{ marginTop: 14, marginBottom: 14, position: "relative", zIndex: isDoctorOpen ? 50 : 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={styles.label}>
                  Consulting Doctor {consultationMode === "Online" ? "(All Clinic Doctors)" : `(${getDayOfWeekAbbr(appointmentDate)})`} *
                </Text>
                {availableOnlyDoctors.length > 0 && (
                  <View style={styles.availableBadge}>
                    <View style={styles.availableDot} />
                    <Text style={styles.availableBadgeText}>
                      {availableOnlyDoctors.length} {consultationMode === "Online" ? "Doctors" : "Available"}
                    </Text>
                  </View>
                )}
              </View>

              {loadingDoctors ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#0284c7" />
                  <Text style={styles.loadingText}>Checking doctor availability...</Text>
                </View>
              ) : (
                <View style={{ position: "relative" }}>
                  <TouchableOpacity
                    style={[
                      styles.doctorDropdownTrigger,
                      isDoctorOpen && styles.dropdownTriggerActive,
                    ]}
                    onPress={() => {
                      setIsDoctorOpen(!isDoctorOpen);
                      setIsBranchOpen(false);
                      setIsModeOpen(false);
                      setIsSourceOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    {selectedDoctor ? (
                      <Text style={[styles.selectedDocName, { flex: 1 }]} numberOfLines={1}>
                        {selectedDoctor.name}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 13, color: "#94a3b8", fontWeight: "600", flex: 1 }}>
                        {availableOnlyDoctors.length === 0
                          ? `No doctors available on this day (${currentBranchName})`
                          : "Select Doctor"}
                      </Text>
                    )}
                    <Feather name={isDoctorOpen ? "chevron-up" : "chevron-down"} size={18} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* INLINE DROPDOWN BELOW FIELD (DR NAME ONLY) */}
                  {isDoctorOpen && (
                    <View style={styles.inlineDoctorMenu}>
                      <ScrollView
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 210 }}
                      >
                        {availableOnlyDoctors.length === 0 ? (
                          <View style={{ padding: 14, alignItems: "center" }}>
                            <Text style={{ fontSize: 12, color: "#64748b" }}>
                              No doctors available at {currentBranchName} on this day.
                            </Text>
                          </View>
                        ) : (
                          availableOnlyDoctors.map((doc) => {
                            const isSelected = selectedDoctor?.id === doc.id;
                            return (
                              <TouchableOpacity
                                key={doc.id}
                                style={[
                                  styles.inlineDoctorItem,
                                  isSelected && styles.inlineDoctorItemSelected,
                                ]}
                                onPress={() => {
                                  setSelectedDoctor(doc);
                                  setSelectedSlot("");
                                  setIsDoctorOpen(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.inlineDoctorName,
                                    isSelected && { color: "#0284c7", fontWeight: "800" },
                                    { flex: 1 },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {doc.name}
                                </Text>
                                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                                  {isSelected && <View style={styles.radioDot} />}
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* TIME SELECTION: ANALOG CLOCK FOR ONLINE, 15-MIN GRID FOR IN-CLINIC */}
            {consultationMode === "Online" ? (
              <View style={{ marginBottom: 14 }}>
                <AnalogClockPicker
                  value={selectedSlot}
                  onChange={setSelectedSlot}
                  doctorName={selectedDoctor?.name}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Select Time Slot (15-min intervals) *</Text>
            {generatedSlots.length === 0 ? (
              <View style={styles.emptyDoctorBox}>
                <Text style={styles.emptyDoctorText}>
                  {availableOnlyDoctors.length === 0
                    ? `No doctors scheduled at ${currentBranchName} on ${getDayOfWeekAbbr(appointmentDate)} (${appointmentDate}).`
                    : !selectedDoctor
                      ? "Please select a doctor from the Consulting Doctor dropdown above to view slots."
                      : `No consultation slots configured for ${selectedDoctor.name} on this day in Doctor Timings.`}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {slotSessions.map((session, sIdx) => {
                  return (
                    <View
                      key={session.id}
                      style={{
                        marginBottom: 10,
                        gap: 8,
                      }}
                    >
                      {/* Session Header */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottomWidth: 1,
                          borderBottomColor: "#f1f5f9",
                          paddingBottom: 6,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#0284c7" }} />
                          <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#1e293b" }}>
                            {session.title}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: "#e2e8f0",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 10,
                          }}
                        >
                          <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#475569" }}>
                            {session.slots.length} {session.slots.length === 1 ? "slot" : "slots"}
                          </Text>
                        </View>
                      </View>

                      {/* Slots Grid (Strictly 4 columns per row with equal spacing) */}
                      <View style={styles.slotsGrid}>
                        {session.slots.map((slot) => {
                          const selected = selectedSlot === slot.time;
                          const isPast = Boolean(slot.isPast);
                          const disabled = slot.isFull || slot.isNoShow || isPast;
                          return (
                            <View key={slot.time} style={{ width: "23.5%", marginBottom: 8, position: "relative" }}>
                              <TouchableOpacity
                                disabled={disabled}
                                onPress={() => {
                                  if (isPast) {
                                    Alert.alert("Notice", `Time slot ${slot.time} has already completed. Please select an upcoming slot.`);
                                    return;
                                  }
                                  if (!slot.isNoShow && !slot.isFull) setSelectedSlot(slot.time);
                                }}
                                style={[
                                  styles.slotItem,
                                  { width: "100%" },
                                  selected && styles.slotItemSelected,
                                  slot.isTemporary && !selected && {
                                    backgroundColor: "#fef3c7",
                                    borderColor: "#fde68a",
                                  },
                                  (slot.isFull || slot.isNoShow) && {
                                    backgroundColor: "#fee2e2",
                                    borderColor: "#fca5a5",
                                    opacity: 0.85,
                                  },
                                  isPast && {
                                    backgroundColor: "#f1f5f9",
                                    borderColor: "#e2e8f0",
                                    opacity: 0.65,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.slotItemText,
                                    selected && { color: "#ffffff", fontWeight: "800" },
                                    (slot.isFull || slot.isNoShow) && { color: "#b91c1c" },
                                    isPast && { color: "#94a3b8", textDecorationLine: "line-through" },
                                  ]}
                                >
                                  {slot.time}
                                </Text>
                                {slot.isNoShow ? (
                                  <View
                                    style={{
                                      backgroundColor: "#e11d48",
                                      paddingHorizontal: 3,
                                      paddingVertical: 0.5,
                                      borderRadius: 2,
                                      marginTop: 1,
                                    }}
                                  >
                                    <Text style={{ fontSize: 7, fontWeight: "800", color: "#ffffff" }}>NO-SHOW</Text>
                                  </View>
                                ) : isPast ? (
                                  <View
                                    style={{
                                      backgroundColor: "#94a3b8",
                                      paddingHorizontal: 3,
                                      paddingVertical: 0.5,
                                      borderRadius: 2,
                                      marginTop: 1,
                                    }}
                                  >
                                    <Text style={{ fontSize: 7, fontWeight: "800", color: "#ffffff" }}>PASSED</Text>
                                  </View>
                                ) : slot.isFull ? (
                                  <View
                                    style={{
                                      backgroundColor: "#ef4444",
                                      paddingHorizontal: 3,
                                      paddingVertical: 0.5,
                                      borderRadius: 2,
                                      marginTop: 1,
                                    }}
                                  >
                                    <Text style={{ fontSize: 7, fontWeight: "800", color: "#ffffff" }}>FULL</Text>
                                  </View>
                                ) : (
                                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 1 }}>
                                    {slot.isTemporary && (
                                      <View
                                        style={{
                                          backgroundColor: selected ? "rgba(255,255,255,0.3)" : "#f59e0b",
                                          paddingHorizontal: 2.5,
                                          paddingVertical: 0.5,
                                          borderRadius: 2,
                                        }}
                                      >
                                        <Text style={{ fontSize: 6.5, fontWeight: "900", color: "#ffffff" }}>EXTRA</Text>
                                      </View>
                                    )}
                                    <Text style={{ fontSize: 8, color: selected ? "#e0f2fe" : "#94a3b8" }}>
                                      ({slot.bookedCount}/3)
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>

                              {/* Delete temporary slot button */}
                              {slot.isTemporary && (
                                <TouchableOpacity
                                  onPress={() => handleRemoveTemporarySlot(slot.time)}
                                  style={{
                                    position: "absolute",
                                    top: -4,
                                    right: -4,
                                    backgroundColor: "#ef4444",
                                    width: 15,
                                    height: 15,
                                    borderRadius: 7.5,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10,
                                  }}
                                >
                                  <Text style={{ color: "#ffffff", fontSize: 9.5, fontWeight: "900", lineHeight: 11 }}>×</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>

                      {/* Dynamic Extension Buttons for this session */}
                      {selectedDoctor && (
                        <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                            <TouchableOpacity
                              onPress={() => handleAddSessionSlot(sIdx, session.suggestedBeforeTime)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                paddingHorizontal: 8,
                                paddingVertical: 5,
                                backgroundColor: "#f0f9ff",
                                borderColor: "#bae6fd",
                                borderWidth: 1,
                                borderRadius: 8,
                              }}
                            >
                              <Feather name="plus" size={11} color="#0284c7" />
                              <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#0284c7" }}>
                                Add Slot Before ({session.suggestedBeforeTime})
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleAddSessionSlot(sIdx, session.suggestedAfterTime)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                paddingHorizontal: 8,
                                paddingVertical: 5,
                                backgroundColor: "#f0fdf4",
                                borderColor: "#bbf7d0",
                                borderWidth: 1,
                                borderRadius: 8,
                              }}
                            >
                              <Feather name="plus" size={11} color="#15803d" />
                              <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#15803d" }}>
                                Add Slot After ({session.suggestedAfterTime})
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
              </View>
            )}
          </View>

          {/* CONFIRM BUTTON */}
          <TouchableOpacity
            onPress={handleBookingSubmit}
            disabled={isSubmitting}
            style={[styles.confirmBtn, isSubmitting && { opacity: 0.6 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#ffffff" />
                <Text style={styles.confirmBtnText}>Confirm Appointment</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* PATIENT SOURCE SELECTION MODAL WITH PERSISTENT SCROLLBAR */}
        <Modal
          visible={isSourceOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSourceOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsSourceOpen(false)}
          >
            <View
              style={[
                styles.modalContainer,
                { width: "90%", maxWidth: 380, maxHeight: "80%", padding: 18 },
              ]}
              onStartShouldSetResponder={() => true}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottomWidth: 1,
                  borderBottomColor: "#f1f5f9",
                  paddingBottom: 12,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "#f0f9ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="megaphone-outline" size={18} color="#0284c7" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14.5, fontWeight: "800", color: "#0f172a" }}>
                      Patient Source
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748b" }}>
                      Select acquisition channel ({MARKETING_SOURCES.length} options)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setIsSourceOpen(false)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: "#f1f5f9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Scrollable List with Native Persistent Scrollbar */}
              <ScrollView
                style={{ maxHeight: 280 }}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingVertical: 4, paddingRight: 4 }}
              >
                {MARKETING_SOURCES.map((source) => {
                  const selected = marketingSource === source;
                  return (
                    <TouchableOpacity
                      key={source}
                      style={[
                        styles.inlineDropdownItem,
                        { paddingVertical: 12, paddingHorizontal: 12, marginVertical: 2 },
                        selected && styles.inlineDropdownItemSelected,
                      ]}
                      onPress={() => {
                        setMarketingSource(source);
                        setIsSourceOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.inlineDropdownText,
                          { fontSize: 13.5 },
                          selected && { color: "#0284c7", fontWeight: "800" },
                        ]}
                      >
                        {source}
                      </Text>
                      <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* CALENDAR DATE PICKER MODAL */}
        <Modal
          visible={calendarModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCalendarModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCalendarModalOpen(false)}
          >
            <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
              <View style={styles.calNavHeader}>
                {(() => {
                  const now = new Date();
                  const isCurrentMonthOrPast =
                    calYear < now.getFullYear() ||
                    (calYear === now.getFullYear() && calMonth <= now.getMonth());
                  return (
                    <TouchableOpacity
                      disabled={isCurrentMonthOrPast}
                      onPress={() => {
                        if (isCurrentMonthOrPast) return;
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      style={{ padding: 4, opacity: isCurrentMonthOrPast ? 0.25 : 1 }}
                    >
                      <Feather name="chevron-left" size={20} color={isCurrentMonthOrPast ? "#94a3b8" : "#0284c7"} />
                    </TouchableOpacity>
                  );
                })()}

                <Text style={{ fontWeight: "800", fontSize: 16, color: "#0f172a" }}>
                  {monthNames[calMonth]} {calYear}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  style={{ padding: 4 }}
                >
                  <Feather name="chevron-right" size={20} color="#0284c7" />
                </TouchableOpacity>
              </View>

              {/* Weekday Labels */}
              <View style={styles.calWeekdaysRow}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <Text key={d} style={styles.calWeekdayText}>{d}</Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.calDaysGrid}>
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.calDayCell} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const formatted = `${String(day).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                  const isSelected = appointmentDate === formatted;
                  const isPastDate = (() => {
                    const t = new Date();
                    t.setHours(0, 0, 0, 0);
                    const cellDate = new Date(calYear, calMonth, day);
                    cellDate.setHours(0, 0, 0, 0);
                    return cellDate.getTime() < t.getTime();
                  })();

                  return (
                    <TouchableOpacity
                      key={day}
                      disabled={isPastDate}
                      onPress={() => {
                        if (isPastDate) return;
                        setAppointmentDate(formatted);
                        setCalendarModalOpen(false);
                      }}
                      style={[
                        styles.calDayCell,
                        isSelected && styles.calDayCellSelected,
                        isPastDate && { opacity: 0.35, backgroundColor: "#f8fafc" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          isSelected && { color: "#ffffff", fontWeight: "800" },
                          isPastDate && { color: "#94a3b8", textDecorationLine: "line-through" },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* SUCCESS CONFIRMATION MODAL */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxWidth: 360, padding: 22, alignItems: "center" }]}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
              </View>

              <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a", marginTop: 8 }}>
                Appointment Confirmed!
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 4 }}>
                Token generated & registered in branch live queue.
              </Text>

              {bookedDetails && (
                <View style={styles.tokenCard}>
                  <View style={styles.tokenBadge}>
                    <Text style={styles.tokenText}>{bookedDetails.regId}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#0284c7", marginTop: 6 }}>
                    Patient ID
                  </Text>
                  <View style={{ width: "100%", height: 1, backgroundColor: "#e2e8f0", marginVertical: 10 }} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
                    {bookedDetails.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Doctor: {bookedDetails.doctor}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Date: {bookedDetails.date} • Slot: {bookedDetails.time}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace("/(reception)" as any);
                }}
              >
                <Text style={styles.doneBtnText}>View in Upcoming Appointments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 10, paddingVertical: 6, alignItems: "center" }}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748b" }}>
                  + Book Another Appointment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* PROFILES POP-UP MODAL (CHECK PROFILES / MULTI-PROFILE POPUP) */}
        <Modal
          visible={isProfilesModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setIsProfilesModalOpen(false);
            setEditingProfileRegId(null);
            setMergingSourceProfile(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%", alignItems: "center" }}
            >
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 24,
                padding: 18,
                width: "92%",
                maxWidth: 420,
                maxHeight: "85%",
                gap: 12,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottomWidth: 1,
                  borderBottomColor: "#f1f5f9",
                  paddingBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "#f0f9ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="people" size={20} color="#0284c7" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>
                      Profiles {modalSearchInput ? `(${modalSearchInput})` : ""}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: "#64748b" }}>
                      {phoneProfiles.length} registered {phoneProfiles.length === 1 ? "profile" : "profiles"} found
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsProfilesModalOpen(false);
                    setEditingProfileRegId(null);
                    setMergingSourceProfile(null);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#f1f5f9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Search/Enter input inside popup box */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#f0f9ff",
                  borderWidth: 1,
                  borderColor: "#bae6fd",
                  borderRadius: 14,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  gap: 8,
                }}
              >
                <Ionicons name="call-outline" size={16} color="#0284c7" />
                <TextInput
                  placeholder="Enter 10-digit Phone or Patient ID..."
                  placeholderTextColor="#94a3b8"
                  value={modalSearchInput}
                  onChangeText={(val) => {
                    setModalSearchInput(val);
                    const clean = val.replace(/\D/g, "");
                    if (clean.length === 10) {
                      fetchAndOpenProfiles(clean, true);
                    }
                  }}
                  onSubmitEditing={() => fetchAndOpenProfiles(modalSearchInput, true)}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#0f172a",
                    paddingVertical: 6,
                  }}
                />
                <TouchableOpacity
                  onPress={() => fetchAndOpenProfiles(modalSearchInput, true)}
                  disabled={!modalSearchInput.trim() || isLoadingProfiles}
                  style={{
                    backgroundColor: "#0284c7",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    opacity: !modalSearchInput.trim() || isLoadingProfiles ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#ffffff" }}>Search</Text>
                </TouchableOpacity>
              </View>

              {/* Body: Profiles List or Merge Mode */}
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {isLoadingProfiles ? (
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                      Loading patient profiles...
                    </Text>
                  </View>
                ) : phoneProfiles.length === 0 ? (
                  <View
                    style={{
                      padding: 24,
                      alignItems: "center",
                      backgroundColor: "#f8fafc",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                    }}
                  >
                    <Ionicons name="person-outline" size={28} color="#94a3b8" />
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#334155", marginTop: 6 }}>
                      {modalSearchInput.trim() ? `No profiles found for "${modalSearchInput}"` : "Enter Mobile or Patient ID above"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 2 }}>
                      You can search another number or create a new profile using the button below.
                    </Text>
                  </View>
                ) : mergingSourceProfile ? (
                  /* Merge Selection */
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: "#fffbeb",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#fde68a",
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#92400e" }}>
                      Merge: {mergingSourceProfile.name} ({mergingSourceProfile.regId})
                    </Text>
                    <Text style={{ fontSize: 11, color: "#78350f" }}>
                      Choose which active profile to keep. All history will be transferred to it:
                    </Text>

                    {phoneProfiles
                      .filter((p) => p.regId !== mergingSourceProfile.regId)
                      .map((p) => {
                        const isTarget = mergingTargetRegId === p.regId;
                        return (
                          <TouchableOpacity
                            key={p.regId}
                            onPress={() => setMergingTargetRegId(p.regId)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: 10,
                              backgroundColor: isTarget ? "#ffffff" : "#fef3c7",
                              borderWidth: 1,
                              borderColor: isTarget ? "#0284c7" : "#fcd34d",
                              borderRadius: 10,
                            }}
                          >
                            <View>
                              <Text style={{ fontSize: 12, fontWeight: "800", color: "#1e293b" }}>
                                {p.name}
                              </Text>
                              <Text style={{ fontSize: 10.5, color: "#64748b" }}>
                                {p.regId} • {p.branch}
                              </Text>
                            </View>
                            {isTarget && <Ionicons name="checkmark-circle" size={18} color="#0284c7" />}
                          </TouchableOpacity>
                        );
                      })}

                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={() => setMergingSourceProfile(null)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          backgroundColor: "#ffffff",
                          borderWidth: 1,
                          borderColor: "#cbd5e1",
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569" }}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={!mergingTargetRegId}
                        onPress={handleExecuteMerge}
                        style={{
                          flex: 2,
                          paddingVertical: 8,
                          backgroundColor: mergingTargetRegId ? "#d97706" : "#cbd5e1",
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#ffffff" }}>
                          Confirm Merge
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* Profiles List */
                  <View style={{ gap: 8 }}>
                    {phoneProfiles.map((p) => {
                      const isEditing = editingProfileRegId === p.regId;
                      const isCurrent = (foundProfile?.regId === p.regId) || (manualRegId === p.regId);

                      return (
                        <View
                          key={p.regId}
                          style={{
                            padding: 10,
                            backgroundColor: isCurrent ? "#f0f9ff" : "#f8fafc",
                            borderWidth: 1,
                            borderColor: isCurrent ? "#0284c7" : "#e2e8f0",
                            borderRadius: 14,
                            gap: 8,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <View style={{ flex: 1 }}>
                              {isEditing ? (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <TextInput
                                    style={{
                                      flex: 1,
                                      fontSize: 12,
                                      fontWeight: "800",
                                      color: "#0f172a",
                                      borderWidth: 1,
                                      borderColor: "#0284c7",
                                      borderRadius: 6,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      backgroundColor: "#ffffff",
                                    }}
                                    value={editingNameVal}
                                    onChangeText={setEditingNameVal}
                                    placeholder="Enter updated name"
                                  />
                                  <TouchableOpacity
                                    onPress={() => handleSaveEditedName(p.regId)}
                                    style={{ backgroundColor: "#0284c7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                  >
                                    <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#ffffff" }}>Save</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => setEditingProfileRegId(null)}
                                    style={{ backgroundColor: "#e2e8f0", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 }}
                                  >
                                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#475569" }}>×</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
                                    {p.name}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setEditingProfileRegId(p.regId);
                                      setEditingNameVal(p.name);
                                    }}
                                  >
                                    <Feather name="edit-2" size={12} color="#0284c7" />
                                  </TouchableOpacity>
                                </View>
                              )}

                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                                <View style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#bae6fd", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#0284c7" }}>{p.regId}</Text>
                                </View>
                                <View style={{ backgroundColor: "#e2e8f0", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#475569" }}>{p.branch}</Text>
                                </View>
                                <Text style={{ fontSize: 10, color: "#64748b" }}>
                                  • {p.appointmentCount || 0} visits
                                </Text>
                              </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <TouchableOpacity
                                onPress={() => handleSelectProfile(p)}
                                style={{
                                  backgroundColor: "#0284c7",
                                  paddingHorizontal: 9,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <Ionicons name="checkmark" size={12} color="#ffffff" />
                                <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#ffffff" }}>
                                  Select
                                </Text>
                              </TouchableOpacity>

                              {phoneProfiles.length > 1 && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setMergingSourceProfile(p);
                                    const other = phoneProfiles.find((o) => o.regId !== p.regId);
                                    setMergingTargetRegId(other ? other.regId : "");
                                  }}
                                  style={{
                                    backgroundColor: "#fef3c7",
                                    borderWidth: 1,
                                    borderColor: "#fde68a",
                                    paddingHorizontal: 7,
                                    paddingVertical: 5,
                                    borderRadius: 8,
                                  }}
                                >
                                  <MaterialCommunityIcons name="source-merge" size={13} color="#b45309" />
                                </TouchableOpacity>
                              )}

                              <TouchableOpacity
                                onPress={() => handleDeleteProfile(p.regId, p.name)}
                                style={{
                                  backgroundColor: "#fee2e2",
                                  borderWidth: 1,
                                  borderColor: "#fecaca",
                                  paddingHorizontal: 6,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                }}
                              >
                                <Feather name="trash-2" size={12} color="#dc2626" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {/* Modal Footer: + Add New Profile */}
              <View style={{ borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10 }}>
                <TouchableOpacity
                  onPress={handleCreateNewProfileForNumber}
                  style={{
                    backgroundColor: "#16a34a",
                    paddingVertical: 9,
                    borderRadius: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Feather name="plus" size={15} color="#ffffff" />
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#ffffff" }}>
                    + Create New Profile for this Number
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="grid-outline" size={22} color="#64748b" />
            <Text style={styles.tabLabel}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} activeOpacity={0.8}>
            <Ionicons name="calendar" size={22} color="#0284c7" />
            <Text style={[styles.tabLabel, { color: "#0284c7", fontWeight: "700" }]}>Book Appt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/(reception)/all-patients" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={22} color="#64748b" />
            <Text style={styles.tabLabel}>Patient List</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/(reception)/medical-requests" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="medkit-outline" size={22} color="#64748b" />
            <Text style={styles.tabLabel}>Med Req</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text style={[styles.tabLabel, { color: "#ef4444" }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* SIDE DRAWER */}
        {isDrawerOpen && (
          <View style={styles.drawerOverlayContainer}>
            <TouchableWithoutFeedback onPress={closeDrawer}>
              <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.drawerHeader}>
                <View style={styles.drawerLogoRow}>
                  <Image
                    source={require("../../../../assets/images/logo.png")}
                    style={styles.drawerLogo}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drawerClinicName}>Spiritual Homeopathy</Text>
                    <View style={styles.drawerRoleBadge}>
                      <Text style={styles.drawerRoleText}>RECEPTION DESK</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.drawerBranchBox}>
                  <Text style={styles.drawerBranchName}>{currentBranchName}</Text>
                  {activeBranch?.phone && (
                    <Text style={styles.drawerBranchPhone}>📞 {activeBranch.phone}</Text>
                  )}
                </View>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.drawerSectionLabel}>RECEPTION FOLDERS</Text>
                {navMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.drawerMenuItem}
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.drawerIconBox}>
                      <Ionicons name={item.icon as any} size={20} color="#0284c7" />
                    </View>
                    <Text style={styles.drawerMenuText}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.drawerFooter}>
                <TouchableOpacity style={styles.drawerLogoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                  <Text style={styles.drawerLogoutText}>Sign Out from Reception</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  topHeader: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  menuButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  radioCircleActive: {
    borderColor: "#0284c7",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0284c7",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284c7",
  },
  rebackToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  rebackToggleBtnActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  rebackToggleText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  badgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#dc2626",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#f1f5f9",
    marginLeft: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  profileFoundBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  profileFoundText: {
    fontSize: 12,
    color: "#15803d",
  },
  suggestionsBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    marginTop: 6,
    maxHeight: 280,
    elevation: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    overflow: "hidden",
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionsHeaderText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  suggestionsCountBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  suggestionsCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369a1",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 10,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionAvatarText: {
    color: "#0284c7",
    fontWeight: "800",
    fontSize: 13,
  },
  suggestionRegIdBadge: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  suggestionRegIdText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 11,
    height: 44,
  },
  dropdownTriggerActive: {
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  dropdownIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownTriggerText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  dropdownModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  dropdownItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  dropdownItemCardSelected: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  dropdownIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  dateSelectorBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    gap: 10,
  },
  doctorDropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 48,
  },
  docAvatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  docAvatarSmallText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  selectedDocName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  selectedDocSpec: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  inlineDropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    marginTop: 4,
    padding: 4,
    elevation: 25,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  inlineDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    marginVertical: 1,
    gap: 8,
  },
  inlineDropdownItemSelected: {
    backgroundColor: "#f0f9ff",
  },
  inlineDropdownText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
  },
  inlineDoctorMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    marginTop: 4,
    padding: 4,
    maxHeight: 220,
    elevation: 25,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  inlineDoctorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 4,
  },
  inlineDoctorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    marginVertical: 1,
  },
  inlineDoctorItemSelected: {
    backgroundColor: "#f0f9ff",
  },
  inlineDoctorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  availableBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#16a34a",
  },
  doctorCardSelected: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  docAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  docAvatarText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  docName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  docSpec: {
    fontSize: 11,
    color: "#64748b",
  },
  loadingBox: {
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  loadingText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  emptyDoctorBox: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyDoctorText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 16,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  slotItem: {
    width: "100%",
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 33,
  },
  slotItemSelected: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  slotItemText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#334155",
  },
  confirmBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    width: "100%",
    maxWidth: 340,
  },
  calNavHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  calWeekdayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    width: 38,
    textAlign: "center",
  },
  calDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calDayCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  calDayCellSelected: {
    backgroundColor: "#0284c7",
  },
  calDayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  tokenCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    alignItems: "center",
  },
  tokenBadge: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tokenText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  doneBtn: {
    width: "100%",
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  drawerOverlayContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: "row",
  },
  drawerBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "#ffffff",
    zIndex: 1000,
    borderRightWidth: 0,
  },
  drawerHeader: {
    padding: 18,
    paddingTop: 44,
    borderBottomWidth: 0,
    backgroundColor: "#ffffff",
  },
  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  drawerLogo: {
    width: 36,
    height: 36,
  },
  drawerClinicName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  drawerRoleBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  drawerRoleText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  drawerBranchBox: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
    borderWidth: 0,
  },
  drawerBranchName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  drawerBranchPhone: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    letterSpacing: 0.5,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    backgroundColor: "transparent",
  },
  drawerIconBox: {
    width: 26,
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "transparent",
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 0,
  },
  drawerLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  drawerLogoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444",
  },
});