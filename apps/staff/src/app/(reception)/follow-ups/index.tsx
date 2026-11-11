import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  BackHandler,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";
import AnalogClockPicker from "../../../components/AnalogClockPicker";

interface FollowUpItem {
  id: string;
  appointmentId: string;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  doctorId?: string;
  branch: string;
  dueDate: string;
  dueTime?: number;
  dueMonth?: number;
  dueYear?: number;
  isOverdue?: boolean;
  isDueToday?: boolean;
  isThisMonth?: boolean;
  isNextMonth?: boolean;
  followUpInterval: string;
  consultationFee?: number;
  notes?: string;
  prescriptionImages?: string[];
  status: "Due Today" | "Overdue" | "Upcoming" | "Confirmed" | "Scheduled" | "Completed" | string;
}

const STANDARD_TIME_SLOTS = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
];

const DOCTOR_OPTIONS = [
  { id: "1793864791241", name: "Dr. Prashanth K Vaidya" },
  { id: "doc-padma", name: "Dr. Padma Priya" },
  { id: "doc-jobeadh", name: "Dr. Jobeadh Parveej" },
  { id: "doc-ramakrishna", name: "Dr. Ramakrishna Chanduri" },
];

const CONSULTATION_MODES = [
  { id: "In-Clinic", label: "In-Clinic Consultation" },
  { id: "Online", label: "Online Consultation" },
];

const BRANCH_OPTIONS = [
  "KPHB Branch",
  "Chandanagar Branch",
  "Nallagandla Branch",
  "Dilshuknagar Branch",
];

const INTERVAL_OPTIONS = [
  "1 Week",
  "2 Weeks",
  "3 Weeks",
  "1 Month",
  "45 Days",
  "2 Months",
  "3 Months",
  "6 Months",
];

function getDayOfWeekAbbr(dateStr: string): string {
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
}

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const clean = t.trim().toUpperCase();
  const match = clean.match(/(\d{1,2})(?::(\d{1,2}))?\s*([APap][Mm])?/);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ap = (match[3] || "").toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function minutesToTimeString(minutes: number): string {
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = String(h).padStart(2, "0");
  const mStr = String(m).padStart(2, "0");
  return `${hStr}:${mStr} ${ap}`;
}

function generateSlotsFromRanges(ranges: any[]): string[] {
  if (!ranges || ranges.length === 0) {
    return STANDARD_TIME_SLOTS;
  }

  const slotList: string[] = [];
  for (const r of ranges) {
    let startMin = 0;
    let endMin = 0;
    if (typeof r === "object" && r?.startHour && r?.endHour) {
      const sHour = r.startHour;
      const sMin = r.startMin ?? r.startMinute ?? "00";
      const sAmPm = r.startAmPm || "AM";
      const eHour = r.endHour;
      const eMin = r.endMin ?? r.endMinute ?? "00";
      const eAmPm = r.endAmPm || "PM";
      startMin = parseTimeToMinutes(`${sHour}:${sMin} ${sAmPm}`);
      endMin = parseTimeToMinutes(`${eHour}:${eMin} ${eAmPm}`);
    } else {
      const rText = typeof r === "string" ? r : (r?.displayText || "");
      const parts = rText.split(/[-–—]|to/i);
      if (parts.length === 2) {
        startMin = parseTimeToMinutes(parts[0]);
        endMin = parseTimeToMinutes(parts[1]);
      }
    }

    if (endMin > startMin) {
      for (let cur = startMin; cur < endMin; cur += 30) {
        slotList.push(minutesToTimeString(cur));
      }
    }
  }

  return slotList.length > 0 ? Array.from(new Set(slotList)) : STANDARD_TIME_SLOTS;
}

function isSlotBlocked(slotTime: string, noShow: any): boolean {
  if (!noShow) return false;
  if (noShow.type === "FULL_DAY") return true;
  if (noShow.type === "HALF_DAY") {
    const curMin = parseTimeToMinutes(slotTime);
    if (noShow.halfDayType === "FIRST_HALF") {
      return curMin < 840;
    } else {
      return curMin >= 840;
    }
  }
  if (noShow.type === "SPECIFIC_TIME" && noShow.startTime && noShow.endTime) {
    const startMin = parseTimeToMinutes(noShow.startTime);
    const endMin = parseTimeToMinutes(noShow.endTime);
    const curMin = parseTimeToMinutes(slotTime);
    return curMin >= startMin && curMin <= endMin;
  }
  return false;
}

export default function ReceptionFollowUpsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);

  // Period Filters matching Web portal exactly (Default to 'this_month' so opening loads only this month)
  const [periodFilter, setPeriodFilter] = useState<
    "this_month" | "next_month" | "due_today" | "overdue" | "all" | "month" | "range"
  >("this_month");

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Aggregate Stats matching Web
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    thisMonth: 0,
    nextMonth: 0,
    completed: 0,
  });

  // Modal State for Choose Month and Date Range
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calTarget, setCalTarget] = useState<"from" | "to" | "reschedule" | "booking">("from");
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  // Reschedule Modal State
  const [rescheduleItem, setRescheduleItem] = useState<FollowUpItem | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [newInterval, setNewInterval] = useState("1 Month");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Book Appointment Modal State
  const [bookingItem, setBookingItem] = useState<FollowUpItem | null>(null);
  const [bookBranch, setBookBranch] = useState("KPHB Branch");
  const [bookDoctorId, setBookDoctorId] = useState("1793864791241");
  const [bookDoctorName, setBookDoctorName] = useState("Dr. Prashanth K Vaidya");
  const [bookDate, setBookDate] = useState("");
  const [bookTimeSlot, setBookTimeSlot] = useState("");
  const [bookMode, setBookMode] = useState<"In-Clinic" | "Online">("In-Clinic");
  const [bookReason, setBookReason] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [savingBooking, setSavingBooking] = useState(false);

  // Dynamic doctors, no-shows & booked appointments for booking modal
  const [bookingAvailableDoctors, setBookingAvailableDoctors] = useState<any[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);
  const [loadingBookingDoctors, setLoadingBookingDoctors] = useState(false);
  const [activeBookingNoShows, setActiveBookingNoShows] = useState<any[]>([]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  }, []);

  // Load Branch Info (Strictly lock to Reception's Branch)
  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b && b.name) {
        setActiveBranch(b);
        setSelectedBranch(b.name);
        setBookBranch(b.name);
      }
    });
  }, []);

  // Fetch Follow-ups synced with Web backend (strictly locked to clinic branch)
  const loadFollowUps = async () => {
    setIsLoading(true);
    try {
      let branchName = activeBranch?.name || selectedBranch;
      if (!branchName || branchName === "All Branches") {
        const b = await getActiveBranch();
        if (b?.name) {
          branchName = b.name;
          setActiveBranch(b);
          setSelectedBranch(b.name);
          setBookBranch(b.name);
        } else {
          branchName = "KPHB Branch";
        }
      }

      let url = `/reception/follow-ups?period=${periodFilter}&branch=${encodeURIComponent(branchName)}`;
      if (periodFilter === "month" && selectedMonth) {
        url += `&selectedMonth=${encodeURIComponent(selectedMonth)}`;
      } else if (periodFilter === "range" && startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await apiFetch<any>(url);
      if (res && res.success) {
        if (Array.isArray(res.followUps)) {
          setFollowUps(res.followUps);
        }
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        setFollowUps([]);
      }
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [periodFilter, selectedMonth, startDate, endDate, selectedBranch]);

  // Handle Search Input Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFollowUps();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCall = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "").slice(-10);
    Linking.openURL(`tel:${clean}`);
  };

  const handleWhatsApp = (phone: string, patientName: string, doctorName: string, dueDate: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "").slice(-10);
    const text = encodeURIComponent(
      `Hello ${patientName},\nThis is Spiritual Homeopathy Clinic. Your follow-up consultation with ${doctorName} is scheduled on ${dueDate}.\nPlease let us know if you would like to confirm your appointment.`
    );
    Linking.openURL(`whatsapp://send?phone=+91${clean}&text=${text}`);
  };

  // Open Reschedule Modal
  const openRescheduleModal = (item: FollowUpItem) => {
    setRescheduleItem(item);
    setNewDueDate(item.dueDate || todayStr);
    setNewInterval(item.followUpInterval || "1 Month");
    setRescheduleNotes(item.notes || "");
  };

  // Submit Reschedule (calls PATCH /reception/follow-ups)
  const handleSaveReschedule = async () => {
    if (!rescheduleItem || !newDueDate) return;
    setSavingReschedule(true);
    try {
      const res = await apiFetch<any>("/reception/follow-ups", {
        method: "PATCH",
        body: JSON.stringify({
          appointmentId: rescheduleItem.appointmentId || rescheduleItem.id,
          newFollowUpDate: newDueDate,
          newInterval,
          notes: rescheduleNotes,
        }),
      });

      if (res && res.success) {
        Alert.alert("Success", `Follow-up for ${rescheduleItem.patientName} rescheduled to ${newDueDate}!`);
        setRescheduleItem(null);
        loadFollowUps();
      } else {
        Alert.alert("Error", res?.error || "Failed to reschedule follow-up");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reschedule follow-up");
    } finally {
      setSavingReschedule(false);
    }
  };

  // Open Booking Modal
  const openBookingModal = (item: FollowUpItem) => {
    setBookingItem(item);
    const initialBranch =
      item.branch ||
      (activeBranch?.name
        ? activeBranch.name.replace(/Spiritual Homeopathy/gi, "").trim()
        : "KPHB Branch");
    setBookBranch(initialBranch.includes("Branch") ? initialBranch : `${initialBranch} Branch`);
    setBookDoctorId(item.doctorId || "1793864791241");
    setBookDoctorName(item.doctorName || "Dr. Prashanth K Vaidya");
    setBookDate(item.dueDate || todayStr);
    setBookTimeSlot("");
    setBookMode("In-Clinic");
    setBookReason(`Follow-up review for ${item.patientName}`);
    setBookNotes(item.notes || "Booked from mobile reception follow-up queue");
  };

  // Fetch doctors and active no-shows for Book Appointment based on branch, date, and mode
  useEffect(() => {
    if (!bookingItem || !bookDate) return;

    let isMounted = true;
    setLoadingBookingDoctors(true);

    if (bookMode === "Online") {
      apiFetch<any>("/admin/employees?category=DOCTOR")
        .then((data) => {
          if (!isMounted) return;
          const docList = Array.isArray(data?.employees) ? data.employees : [];
          const mapped = docList.map((d: any) => ({
            id: d.id,
            doctorId: d.id,
            name: d.name,
            doctorName: d.name,
            specialty: d.designation || d.specialty || "Homeopathic Consultant",
            slots: [],
          }));
          setBookingAvailableDoctors(mapped);
          setActiveBookingNoShows([]);

          if (mapped.length > 0) {
            const match = mapped.find(
              (d: any) => d.id === bookDoctorId || d.name === bookDoctorName
            );
            const sel = match || mapped[0];
            setBookDoctorId(sel.id);
            setBookDoctorName(sel.name);
          }
        })
        .catch((err) => {
          console.error("Error fetching online doctors:", err);
          if (isMounted) setBookingAvailableDoctors([]);
        })
        .finally(() => {
          if (isMounted) setLoadingBookingDoctors(false);
        });

      return () => {
        isMounted = false;
      };
    }

    // In-Clinic Mode
    const day = getDayOfWeekAbbr(bookDate);
    const cleanBranch = bookBranch.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

    Promise.all([
      apiFetch<any>(`/admin/doctor-timings?branch=${encodeURIComponent(cleanBranch)}&day=${day}`),
      apiFetch<any>(`/reception/doctor-no-show?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(bookDate)}`),
    ])
      .then(([timingsRes, noShowRes]) => {
        if (!isMounted) return;
        let noShows: any[] = [];
        if (noShowRes && noShowRes.success && Array.isArray(noShowRes.noShows)) {
          noShows = noShowRes.noShows;
        }
        setActiveBookingNoShows(noShows);

        let doctors: any[] = [];
        if (timingsRes && timingsRes.success && Array.isArray(timingsRes.doctors)) {
          doctors = timingsRes.doctors;
        }

        const availableDocs = doctors.map((d: any) => ({
          ...d,
          id: d.doctorId || d.id,
          doctorId: d.doctorId || d.id,
          name: d.doctorName || d.name,
          doctorName: d.doctorName || d.name,
        }));

        setBookingAvailableDoctors(availableDocs);

        // Select doctor
        const currentDocMatch = availableDocs.find(
          (d: any) => d.doctorId === bookDoctorId || d.id === bookDoctorId || d.doctorName === bookDoctorName
        );
        const activeDoc = currentDocMatch || availableDocs[0] || null;

        if (activeDoc) {
          setBookDoctorId(activeDoc.doctorId || activeDoc.id);
          setBookDoctorName(activeDoc.doctorName || activeDoc.name);
        } else {
          setBookDoctorId("");
          setBookDoctorName("");
          setBookTimeSlot("");
        }
      })
      .catch((err) => {
        console.error("Error fetching mobile booking doctors:", err);
        if (isMounted) {
          setBookingAvailableDoctors([]);
          setActiveBookingNoShows([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingBookingDoctors(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingItem, bookBranch, bookDate, bookMode]);

  // Fetch booked appointments for live slot capacity calculation (In-Clinic mode)
  useEffect(() => {
    if (!bookingItem || bookMode !== "In-Clinic" || !bookDoctorId || !bookDate) {
      setBookedAppointments([]);
      return;
    }

    let isMounted = true;
    const cleanBranch = bookBranch.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

    apiFetch<any>(
      `/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(bookDate)}&doctorId=${encodeURIComponent(bookDoctorId)}`
    )
      .then((data) => {
        if (!isMounted) return;
        if (data && data.success && Array.isArray(data.appointments)) {
          setBookedAppointments(data.appointments);
        } else {
          setBookedAppointments([]);
        }
      })
      .catch(() => {
        if (isMounted) setBookedAppointments([]);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingItem, bookMode, bookBranch, bookDate, bookDoctorId]);

  // Compute 15-minute slot sessions with 3-capacity per slot for In-Clinic mode
  const bookingSlotSessions = useMemo(() => {
    if (bookMode === "Online" || !bookDoctorId || bookingAvailableDoctors.length === 0) return [];

    const selectedDoc = bookingAvailableDoctors.find(
      (d: any) => (d.doctorId || d.id) === bookDoctorId
    );
    if (!selectedDoc) return [];

    let ranges = Array.isArray(selectedDoc.slots) ? selectedDoc.slots : [];
    if (ranges.length === 0) {
      if (selectedDoc.shift1Start && selectedDoc.shift1End) {
        ranges = [{ displayText: `${selectedDoc.shift1Start} - ${selectedDoc.shift1End}` }];
      } else if (selectedDoc.shiftHours && selectedDoc.shiftHours.includes("-")) {
        ranges = [{ displayText: selectedDoc.shiftHours }];
      } else {
        ranges = [
          { displayText: "10:00 AM - 01:00 PM" },
          { displayText: "05:00 PM - 09:00 PM" },
        ];
      }
    }

    const doctorNoShow = activeBookingNoShows.find(
      (ns) =>
        ns.doctorId === selectedDoc.doctorId ||
        ns.doctorId === selectedDoc.id ||
        ns.doctorName === selectedDoc.name ||
        ns.doctorName === selectedDoc.doctorName
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

    const getSlotBookedCount = (timeStr: string) => {
      const normTime = timeStr.trim().toUpperCase();
      return bookedAppointments.filter(
        (a) => (a.timeSlot || "").trim().toUpperCase() === normTime && a.status !== "CANCELLED"
      ).length;
    };

    return ranges.map((r: any, sIdx: number) => {
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

      if (startMin === 0 && endMin === 0) {
        startMin = 600; // 10:00 AM
        endMin = 780;  // 01:00 PM
      }

      if (endMin <= startMin) {
        endMin = startMin + 180;
      }

      const sessionSlots: { time: string; bookedCount: number; maxCapacity: number; isFull: boolean; isNoShow: boolean }[] = [];

      for (let cur = startMin; cur < endMin; cur += 15) {
        const timeStr = minutesToTimeString(cur);
        const isNoShow = checkIsSlotNoShow(cur);
        const bookedCount = getSlotBookedCount(timeStr);
        const isFull = isNoShow || bookedCount >= 3;
        sessionSlots.push({
          time: timeStr,
          bookedCount,
          maxCapacity: 3,
          isFull,
          isNoShow,
        });
      }

      const displayRange = rText || `${minutesToTimeString(startMin)} - ${minutesToTimeString(endMin)}`;
      const title = ranges.length > 1 ? `Session ${sIdx + 1} (${displayRange})` : `Consultation Session (${displayRange})`;

      return {
        id: `session-${sIdx + 1}`,
        title,
        slots: sessionSlots,
      };
    });
  }, [bookingAvailableDoctors, bookDoctorId, bookMode, activeBookingNoShows, bookedAppointments]);

  // Submit Booking (calls POST /reception/follow-ups)
  const handleConfirmBooking = async () => {
    if (!bookingItem || !bookDate || !bookTimeSlot) return;
    setSavingBooking(true);
    try {
      const res = await apiFetch<any>("/reception/follow-ups", {
        method: "POST",
        body: JSON.stringify({
          registrationId: bookingItem.mrn,
          patientName: bookingItem.patientName,
          phoneNumber: bookingItem.phone,
          branch: bookMode === "Online" ? "Online Consultation" : bookBranch,
          doctorId: bookDoctorId,
          doctorName: bookDoctorName,
          appointmentDate: bookDate,
          selectedTimeSlot: bookTimeSlot,
          consultationMode: bookMode,
          diseases: bookReason,
          notes: bookNotes,
        }),
      });

      if (res && res.success) {
        Alert.alert(
          "Success",
          `Appointment successfully booked for ${bookingItem.patientName} on ${bookDate} (${bookTimeSlot})!`
        );
        setBookingItem(null);
        loadFollowUps();
      } else {
        Alert.alert("Error", res?.error || "Failed to book appointment");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to book appointment");
    } finally {
      setSavingBooking(false);
    }
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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Patient Follow-Ups</Text>
          <Text style={styles.headerSub}>
            {(activeBranch?.name || "KPHB Branch").replace(/Spiritual Homeopathy/gi, "").trim()} • Live Queue
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadFollowUps} activeOpacity={0.7}>
          <Ionicons name="refresh" size={15} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={15} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, phone, or MRN..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Period Filter Bar (Synced with Web) */}
      <View style={styles.periodBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodScrollContent}
        >
          {/* This Month (FIRST & DEFAULT) */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "this_month" && styles.periodChipActiveSky]}
            onPress={() => setPeriodFilter("this_month")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar"
              size={12}
              color={periodFilter === "this_month" ? "#ffffff" : "#0284c7"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "this_month" && styles.periodChipTextActive,
              ]}
            >
              This Month
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "this_month" ? styles.countBadgeActiveWhite : styles.countBadgeSky,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "this_month" ? styles.countBadgeTextSky : styles.countBadgeTextSkyDark,
                ]}
              >
                {stats.thisMonth}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Next Month */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "next_month" && styles.periodChipActiveIndigo]}
            onPress={() => setPeriodFilter("next_month")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar-outline"
              size={12}
              color={periodFilter === "next_month" ? "#ffffff" : "#4f46e5"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "next_month" && styles.periodChipTextActive,
              ]}
            >
              Next Month
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "next_month" ? styles.countBadgeActiveWhite : styles.countBadgeIndigo,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "next_month" ? styles.countBadgeTextIndigo : styles.countBadgeTextIndigoDark,
                ]}
              >
                {stats.nextMonth}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Due Today */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "due_today" && styles.periodChipActiveAmber]}
            onPress={() => setPeriodFilter("due_today")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="time"
              size={12}
              color={periodFilter === "due_today" ? "#ffffff" : "#d97706"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "due_today" && styles.periodChipTextActive,
              ]}
            >
              Due Today
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "due_today" ? styles.countBadgeActiveWhite : styles.countBadgeAmber,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "due_today" ? styles.countBadgeTextAmber : styles.countBadgeTextAmberDark,
                ]}
              >
                {stats.dueToday}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Overdue */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "overdue" && styles.periodChipActiveRose]}
            onPress={() => setPeriodFilter("overdue")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="alert-circle"
              size={12}
              color={periodFilter === "overdue" ? "#ffffff" : "#e11d48"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "overdue" && styles.periodChipTextActive,
              ]}
            >
              Overdue
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "overdue" ? styles.countBadgeActiveWhite : styles.countBadgeRose,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "overdue" ? styles.countBadgeTextRose : styles.countBadgeTextRoseDark,
                ]}
              >
                {stats.overdue}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Choose Month Picker Button */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "month" && styles.periodChipActiveSky]}
            onPress={() => setShowMonthModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar-outline"
              size={12}
              color={periodFilter === "month" ? "#ffffff" : "#0284c7"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "month" && styles.periodChipTextActive,
              ]}
            >
              {periodFilter === "month" && selectedMonth ? selectedMonth : "Choose Month"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={11}
              color={periodFilter === "month" ? "#ffffff" : "#64748b"}
            />
          </TouchableOpacity>

          {/* Date Range Picker Button */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "range" && styles.periodChipActiveSky]}
            onPress={() => setShowRangeModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="git-compare-outline"
              size={12}
              color={periodFilter === "range" ? "#ffffff" : "#0284c7"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "range" && styles.periodChipTextActive,
              ]}
            >
              {periodFilter === "range" && startDate && endDate
                ? `${startDate.slice(0, 5)} - ${endDate.slice(0, 5)}`
                : "Date Range"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={11}
              color={periodFilter === "range" ? "#ffffff" : "#64748b"}
            />
          </TouchableOpacity>

          {/* All Follow-Ups (MOVED TO LAST) */}
          <TouchableOpacity
            style={[styles.periodChip, periodFilter === "all" && styles.periodChipActiveDark]}
            onPress={() => setPeriodFilter("all")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="list"
              size={12}
              color={periodFilter === "all" ? "#ffffff" : "#475569"}
            />
            <Text
              style={[
                styles.periodChipText,
                periodFilter === "all" && styles.periodChipTextActive,
              ]}
            >
              All Follow-Ups
            </Text>
            <View
              style={[
                styles.countBadge,
                periodFilter === "all" ? styles.countBadgeActiveWhite : styles.countBadgeSlate,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  periodFilter === "all" ? styles.countBadgeTextDark : styles.countBadgeTextSlateDark,
                ]}
              >
                {stats.total}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. Follow-up List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isLoading ? (
          <View style={styles.emptyStateContainer}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.emptySubText}>Loading follow-ups...</Text>
          </View>
        ) : followUps.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={42} color="#16a34a" />
            <Text style={styles.emptyTitleText}>No Follow-ups Found</Text>
            <Text style={styles.emptySubText}>
              Try switching to "All Follow-Ups" or another month.
            </Text>
            <TouchableOpacity
              style={styles.showAllBtn}
              onPress={() => setPeriodFilter("all")}
              activeOpacity={0.7}
            >
              <Text style={styles.showAllBtnText}>Show All Follow-ups ({stats.total})</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 7 }}>
            {followUps.map((item, index) => {
              const cleanPhone = (item.phone || "").replace(/\D/g, "").slice(-10);
              const isToday = item.dueDate === todayStr || item.isDueToday;
              const isOverdue = item.isOverdue || item.status === "Overdue";

              return (
                <View key={item.id || index} style={styles.followUpCard}>
                  {/* Top Row: Patient Name, MRN, Phone & Due Date Status */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Text style={styles.patientName} numberOfLines={1}>
                          {item.patientName}
                        </Text>
                        <View style={styles.mrnBadge}>
                          <Text style={styles.mrnBadgeText}>{item.mrn}</Text>
                        </View>
                      </View>
                      <Text style={styles.phoneText}>📞 {cleanPhone || "—"}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isOverdue
                          ? styles.statusOverdue
                          : isToday
                          ? styles.statusToday
                          : styles.statusUpcoming,
                      ]}
                    >
                      <Ionicons
                        name={isOverdue ? "alert-circle" : isToday ? "time" : "calendar-outline"}
                        size={10}
                        color={isOverdue ? "#e11d48" : isToday ? "#b45309" : "#0369a1"}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          isOverdue
                            ? styles.statusTextOverdue
                            : isToday
                            ? styles.statusTextToday
                            : styles.statusTextUpcoming,
                        ]}
                      >
                        {isOverdue ? "Overdue" : isToday ? "Due Today" : item.dueDate}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Meta Row: Doctor, Interval, Branch */}
                  <View style={styles.cardMetaRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, flex: 1 }}>
                      <Ionicons name="medkit-outline" size={11} color="#64748b" />
                      <Text style={styles.metaDoctorText} numberOfLines={1}>
                        {item.doctorName?.startsWith("Dr.") ? item.doctorName : `Dr. ${item.doctorName || "Consultant"}`}
                      </Text>
                    </View>

                    <View style={styles.intervalChipSmall}>
                      <Text style={styles.intervalChipSmallText}>{item.followUpInterval || "1 Month"}</Text>
                    </View>

                    <Text style={styles.metaBranchText} numberOfLines={1}>
                      📍 {item.branch || "KPHB"}
                    </Text>
                  </View>

                  {/* Actions Row: Reschedule, Book Appointment, Call, WhatsApp */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.rescheduleBtn}
                      onPress={() => openRescheduleModal(item)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="refresh" size={11} color="#ffffff" />
                      <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.bookAppointmentBtn}
                      onPress={() => openBookingModal(item)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="calendar" size={11} color="#ffffff" />
                      <Text style={styles.bookAppointmentBtnText}>Book Appointment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.callIconBtn}
                      onPress={() => handleCall(item.phone)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={12} color="#0284c7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.whatsAppIconBtn}
                      onPress={() =>
                        handleWhatsApp(item.phone, item.patientName, item.doctorName, item.dueDate)
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#16a34a" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 5. RESCHEDULE MODAL */}
      {rescheduleItem && (
        <Modal
          visible={!!rescheduleItem}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRescheduleItem(null)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setRescheduleItem(null)}
          >
            <View style={styles.actionModalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.rescheduleModalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="refresh" size={16} color="#ffffff" />
                  <Text style={styles.actionModalTitle}>Reschedule Follow-Up</Text>
                </View>
                <TouchableOpacity onPress={() => setRescheduleItem(null)}>
                  <Ionicons name="close" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <View style={styles.patientInfoPill}>
                  <Text style={styles.patientInfoName}>{rescheduleItem.patientName}</Text>
                  <Text style={styles.patientInfoMrn}>{rescheduleItem.mrn}</Text>
                </View>

                {/* Current Due Date */}
                <View style={styles.currentDueBox}>
                  <Text style={styles.currentDueLabel}>Current Due Date:</Text>
                  <Text style={styles.currentDueValue}>{rescheduleItem.dueDate}</Text>
                </View>

                {/* New Due Date Picker */}
                <Text style={styles.inputFieldLabel}>NEW FOLLOW-UP DATE *</Text>
                <TouchableOpacity
                  style={styles.datePickerTriggerBtn}
                  onPress={() => {
                    setCalTarget("reschedule");
                    setShowCalendarModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={14} color="#2563eb" />
                  <Text style={styles.datePickerTriggerText}>{newDueDate || "Select Date"}</Text>
                  <Ionicons name="chevron-forward" size={13} color="#94a3b8" />
                </TouchableOpacity>

                {/* Follow-up Interval Chips */}
                <Text style={[styles.inputFieldLabel, { marginTop: 10 }]}>FOLLOW-UP INTERVAL</Text>
                <View style={styles.chipsContainer}>
                  {INTERVAL_OPTIONS.map((intv) => (
                    <TouchableOpacity
                      key={intv}
                      style={[styles.chipItem, newInterval === intv && styles.chipItemActiveAmber]}
                      onPress={() => setNewInterval(intv)}
                    >
                      <Text
                        style={[
                          styles.chipItemText,
                          newInterval === intv && styles.chipItemTextActive,
                        ]}
                      >
                        {intv}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reschedule Notes */}
                <Text style={[styles.inputFieldLabel, { marginTop: 10 }]}>REASON / REMARKS</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Patient requested postponement, traveling, etc."
                  placeholderTextColor="#94a3b8"
                  value={rescheduleNotes}
                  onChangeText={setRescheduleNotes}
                  multiline
                  numberOfLines={2}
                />
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setRescheduleItem(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmAmberBtn}
                  onPress={handleSaveReschedule}
                  disabled={savingReschedule || !newDueDate}
                >
                  {savingReschedule ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Save Reschedule</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* 6. BOOK APPOINTMENT MODAL */}
      {bookingItem && (
        <Modal
          visible={!!bookingItem}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setBookingItem(null)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setBookingItem(null)}
          >
            <View style={styles.actionModalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.bookingModalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="calendar" size={16} color="#ffffff" />
                  <Text style={styles.actionModalTitle}>Book Follow-Up Appointment</Text>
                </View>
                <TouchableOpacity onPress={() => setBookingItem(null)}>
                  <Ionicons name="close" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
                <View style={styles.patientInfoPillSky}>
                  <View>
                    <Text style={styles.patientInfoName}>{bookingItem.patientName}</Text>
                    <Text style={styles.patientInfoPhone}>📞 {bookingItem.phone || "No Phone"}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <Text style={styles.patientInfoMrnSky}>{bookingItem.mrn}</Text>
                    {bookBranch && bookMode === "In-Clinic" && (
                      <View style={{ backgroundColor: "#ffffff", paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1, borderColor: "#bae6fd" }}>
                        <Text style={{ fontSize: 9, fontWeight: "700", color: "#0284c7" }}>
                          {bookBranch.replace(" Branch", "")}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Consultation Mode */}
                <Text style={styles.inputFieldLabel}>CONSULTATION MODE *</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                  {CONSULTATION_MODES.map((m) => {
                    const isSelected = bookMode === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.modeBtn,
                          isSelected && styles.modeBtnActive,
                        ]}
                        onPress={() => {
                          setBookMode(m.id as "In-Clinic" | "Online");
                          setBookTimeSlot("");
                        }}
                      >
                        <Ionicons
                          name={m.id === "In-Clinic" ? "business" : "videocam"}
                          size={13}
                          color={isSelected ? "#0284c7" : "#64748b"}
                        />
                        <Text
                          style={[
                            styles.modeBtnText,
                            isSelected && styles.modeBtnTextActive,
                          ]}
                        >
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Doctor Selection */}
                <Text style={[styles.inputFieldLabel, { marginTop: 10 }]}>
                  CONSULTANT DOCTOR {bookMode === "In-Clinic" ? `(${getDayOfWeekAbbr(bookDate)})` : "(ALL CLINICS)"} *
                </Text>
                {loadingBookingDoctors ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={{ fontSize: 11, color: "#64748b" }}>Loading doctors...</Text>
                  </View>
                ) : bookingAvailableDoctors.length === 0 ? (
                  <View style={{ backgroundColor: "#ffe4e6", padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#fecdd3" }}>
                    <Text style={{ fontSize: 10.5, color: "#e11d48", fontWeight: "700" }}>
                      {bookMode === "Online"
                        ? "No online doctors available"
                        : `No doctors available at ${bookBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.chipsContainer}>
                    {bookingAvailableDoctors.map((doc: any) => {
                      const dId = doc.doctorId || doc.id;
                      const dName = doc.doctorName || doc.name;
                      const isSelected = bookDoctorId === dId;
                      return (
                        <TouchableOpacity
                          key={dId}
                          style={[styles.chipItem, isSelected && styles.chipItemActiveSky]}
                          onPress={() => {
                            setBookDoctorId(dId);
                            setBookDoctorName(dName);
                          }}
                        >
                          <Text
                            style={[
                              styles.chipItemText,
                              isSelected && styles.chipItemTextActive,
                            ]}
                          >
                            {dName.replace("Dr. ", "")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Date Selection */}
                <Text style={[styles.inputFieldLabel, { marginTop: 10 }]}>APPOINTMENT DATE *</Text>
                <TouchableOpacity
                  style={styles.datePickerTriggerBtn}
                  onPress={() => {
                    setCalTarget("booking");
                    setShowCalendarModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={14} color="#0284c7" />
                  <Text style={styles.datePickerTriggerText}>{bookDate || "Select Date"}</Text>
                  <Ionicons name="chevron-forward" size={13} color="#94a3b8" />
                </TouchableOpacity>

                {/* Time Selection: Analog Clock for Online, 15-Min Grid for In-Clinic */}
                {bookMode === "Online" ? (
                  <View style={{ marginTop: 12 }}>
                    <AnalogClockPicker
                      value={bookTimeSlot}
                      onChange={setBookTimeSlot}
                      doctorName={bookDoctorName}
                    />
                  </View>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={styles.inputFieldLabel}>SELECT TIME SLOT (15-MIN INTERVALS) *</Text>
                      {bookTimeSlot ? (
                        <Text style={{ fontSize: 10, color: "#0284c7", fontWeight: "800" }}>
                          Selected: {bookTimeSlot}
                        </Text>
                      ) : null}
                    </View>

                    {bookingSlotSessions.length === 0 ? (
                      <View style={{ backgroundColor: "#fef3c7", padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#fde68a" }}>
                        <Text style={{ fontSize: 10.5, color: "#b45309", fontWeight: "700" }}>
                          {bookingAvailableDoctors.length === 0
                            ? `No doctors scheduled at ${bookBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}.`
                            : !bookDoctorId
                            ? "Please select a doctor to view their consultation slots."
                            : `No consultation slots configured for ${bookDoctorName} on this day.`}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {bookingSlotSessions.map((session: any) => (
                          <View key={session.id} style={{ gap: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 4 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#0284c7" }} />
                                <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#1e293b" }}>{session.title}</Text>
                              </View>
                              <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b" }}>{session.slots.length} slots</Text>
                            </View>

                            <View style={styles.slotsGrid}>
                              {session.slots.map((slot: any) => {
                                const isSelected = bookTimeSlot === slot.time;
                                const disabled = slot.isFull || slot.isNoShow;
                                return (
                                  <View key={slot.time} style={{ width: "23.5%", marginBottom: 6 }}>
                                    <TouchableOpacity
                                      disabled={disabled}
                                      onPress={() => setBookTimeSlot(slot.time)}
                                      style={[
                                        styles.slotItem,
                                        isSelected && styles.slotItemSelected,
                                        disabled && { backgroundColor: "#fee2e2", borderColor: "#fca5a5", opacity: 0.8 },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.slotItemText,
                                          isSelected && { color: "#ffffff", fontWeight: "800" },
                                          disabled && { color: "#b91c1c" },
                                        ]}
                                      >
                                        {slot.time}
                                      </Text>
                                      {slot.isNoShow ? (
                                        <View style={{ backgroundColor: "#e11d48", paddingHorizontal: 2.5, paddingVertical: 0.5, borderRadius: 2, marginTop: 1 }}>
                                          <Text style={{ fontSize: 6.5, fontWeight: "800", color: "#ffffff" }}>NO-SHOW</Text>
                                        </View>
                                      ) : slot.isFull ? (
                                        <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 2.5, paddingVertical: 0.5, borderRadius: 2, marginTop: 1 }}>
                                          <Text style={{ fontSize: 6.5, fontWeight: "800", color: "#ffffff" }}>FULL</Text>
                                        </View>
                                      ) : (
                                        <Text style={{ fontSize: 7.5, color: isSelected ? "#e0f2fe" : "#94a3b8", marginTop: 1 }}>
                                          ({slot.bookedCount}/3)
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Reason */}
                <Text style={[styles.inputFieldLabel, { marginTop: 10 }]}>REASON FOR VISIT</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Follow-up consultation, symptom review"
                  placeholderTextColor="#94a3b8"
                  value={bookReason}
                  onChangeText={setBookReason}
                />
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setBookingItem(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmSkyBtn}
                  onPress={handleConfirmBooking}
                  disabled={savingBooking || !bookDate || !bookTimeSlot}
                >
                  {savingBooking ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Confirm Booking</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* 7. CHOOSE MONTH MODAL */}
      <Modal
        visible={showMonthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Follow-Up Month ({calYear})</Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <Ionicons name="close" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthsGrid}>
              {monthNames.map((name, idx) => {
                const monthKey = `${calYear}-${String(idx + 1).padStart(2, "0")}`;
                const isSelected = selectedMonth === monthKey && periodFilter === "month";
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthCell, isSelected && styles.monthCellActive]}
                    onPress={() => {
                      setSelectedMonth(monthKey);
                      setPeriodFilter("month");
                      setShowMonthModal(false);
                    }}
                  >
                    <Text
                      style={[styles.monthCellText, isSelected && styles.monthCellTextActive]}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 8. DATE RANGE MODAL */}
      <Modal
        visible={showRangeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRangeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowRangeModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowRangeModal(false)}>
                <Ionicons name="close" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, paddingVertical: 8 }}>
              <View>
                <Text style={styles.rangeInputLabel}>FROM DATE</Text>
                <TouchableOpacity
                  style={styles.rangeDateBtn}
                  onPress={() => {
                    setCalTarget("from");
                    setShowCalendarModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={14} color="#0284c7" />
                  <Text style={styles.rangeDateBtnText}>{startDate || "Choose From Date"}</Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.rangeInputLabel}>TO DATE</Text>
                <TouchableOpacity
                  style={styles.rangeDateBtn}
                  onPress={() => {
                    setCalTarget("to");
                    setShowCalendarModal(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={14} color="#0284c7" />
                  <Text style={styles.rangeDateBtnText}>{endDate || "Choose To Date"}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.applyRangeBtn}
                onPress={() => {
                  if (startDate && endDate) {
                    setPeriodFilter("range");
                  }
                  setShowRangeModal(false);
                }}
              >
                <Text style={styles.applyRangeBtnText}>Apply Date Range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 9. INTERACTIVE CALENDAR MODAL */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <View style={styles.calModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.calHeaderRow}>
              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 0) {
                    setCalMonth(11);
                    setCalYear((y) => y - 1);
                  } else {
                    setCalMonth((m) => m - 1);
                  }
                }}
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-back" size={16} color="#0284c7" />
              </TouchableOpacity>

              <Text style={styles.calMonthTitle}>
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
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-forward" size={16} color="#0284c7" />
              </TouchableOpacity>
            </View>

            <View style={styles.calWeekdaysRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
                <Text key={w} style={styles.calWeekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.calDaysGrid}>
              {Array.from({
                length: new Date(calYear, calMonth, 1).getDay(),
              }).map((_, i) => (
                <View key={`pad-${i}`} style={styles.calDayCell} />
              ))}

              {Array.from({
                length: new Date(calYear, calMonth + 1, 0).getDate(),
              }).map((_, idx) => {
                const day = idx + 1;
                const formatted = `${String(day).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                const isSelected =
                  calTarget === "from"
                    ? startDate === formatted
                    : calTarget === "to"
                    ? endDate === formatted
                    : calTarget === "reschedule"
                    ? newDueDate === formatted
                    : bookDate === formatted;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      if (calTarget === "from") {
                        setStartDate(formatted);
                      } else if (calTarget === "to") {
                        setEndDate(formatted);
                      } else if (calTarget === "reschedule") {
                        setNewDueDate(formatted);
                      } else if (calTarget === "booking") {
                        setBookDate(formatted);
                      }
                      setShowCalendarModal(false);
                    }}
                    style={[styles.calDayCell, isSelected && styles.calDayCellSelected]}
                  >
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 10. Fixed Bottom Navigation Bar */}
      <ReceptionBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  backBtn: {
    padding: 5,
    borderRadius: 7,
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    fontSize: 10.5,
    color: "#64748b",
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 9,
    gap: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    color: "#0f172a",
    padding: 0,
  },
  periodBarContainer: {
    marginTop: 8,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  periodScrollContent: {
    paddingHorizontal: 10,
    gap: 6,
    alignItems: "center",
  },
  periodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  periodChipActiveSky: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  periodChipActiveIndigo: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  periodChipActiveAmber: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },
  periodChipActiveRose: {
    backgroundColor: "#e11d48",
    borderColor: "#e11d48",
  },
  periodChipActiveDark: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  periodChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: "center",
  },
  countBadgeActiveWhite: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  countBadgeSky: {
    backgroundColor: "#e0f2fe",
  },
  countBadgeIndigo: {
    backgroundColor: "#e0e7ff",
  },
  countBadgeAmber: {
    backgroundColor: "#fef3c7",
  },
  countBadgeRose: {
    backgroundColor: "#ffe4e6",
  },
  countBadgeSlate: {
    backgroundColor: "#f1f5f9",
  },
  countBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
  },
  countBadgeTextSky: {
    color: "#ffffff",
  },
  countBadgeTextSkyDark: {
    color: "#0284c7",
  },
  countBadgeTextIndigo: {
    color: "#ffffff",
  },
  countBadgeTextIndigoDark: {
    color: "#4f46e5",
  },
  countBadgeTextAmber: {
    color: "#ffffff",
  },
  countBadgeTextAmberDark: {
    color: "#b45309",
  },
  countBadgeTextRose: {
    color: "#ffffff",
  },
  countBadgeTextRoseDark: {
    color: "#e11d48",
  },
  countBadgeTextDark: {
    color: "#ffffff",
  },
  countBadgeTextSlateDark: {
    color: "#334155",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 75,
  },
  emptyStateContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  emptyTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 16,
  },
  showAllBtn: {
    marginTop: 12,
    backgroundColor: "#0284c7",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  showAllBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },
  // Compact Follow-Up Card Styles
  followUpCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 9,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patientName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    maxWidth: 160,
  },
  mrnBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mrnBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
  },
  phoneText: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusToday: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  statusOverdue: {
    backgroundColor: "#ffe4e6",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  statusUpcoming: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  statusTextToday: {
    color: "#b45309",
  },
  statusTextOverdue: {
    color: "#e11d48",
  },
  statusTextUpcoming: {
    color: "#0369a1",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  metaDoctorText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1e293b",
  },
  intervalChipSmall: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  intervalChipSmallText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  metaBranchText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  rescheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563eb",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  rescheduleBtnText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: "800",
  },
  bookAppointmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  bookAppointmentBtnText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: "800",
  },
  callIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  whatsAppIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  // Modal Base Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 330,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  actionModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  rescheduleModalHeader: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bookingModalHeader: {
    backgroundColor: "#0284c7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  actionModalTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  patientInfoPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 8,
  },
  patientInfoPillSky: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#bae6fd",
    marginBottom: 8,
  },
  patientInfoName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  patientInfoMrn: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1d4ed8",
    fontFamily: "monospace",
  },
  patientInfoMrnSky: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369a1",
    fontFamily: "monospace",
  },
  patientInfoPhone: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
  currentDueBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  currentDueLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748b",
  },
  currentDueValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  inputFieldLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  datePickerTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  datePickerTriggerText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginLeft: 6,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  chipItem: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipItemSlot: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipItemActiveAmber: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  chipItemActiveSky: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
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
    borderRadius: 7,
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
  chipItemText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  chipItemTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  modeBtnActive: {
    backgroundColor: "#f0f9ff",
    borderColor: "#0284c7",
  },
  modeBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748b",
  },
  modeBtnTextActive: {
    color: "#0284c7",
    fontWeight: "800",
  },
  modalTextInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 11,
    color: "#0f172a",
  },
  modalActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalCancelBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  modalConfirmAmberBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
  },
  modalConfirmSkyBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
  },
  modalConfirmBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  monthCell: {
    width: "30%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  monthCellActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  monthCellText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  monthCellTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  rangeInputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 3,
  },
  rangeDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rangeDateBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  applyRangeBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  applyRangeBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },
  calModalCard: {
    width: "86%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  calHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calMonthTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  calNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 6,
    marginBottom: 6,
  },
  calWeekdayText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    width: 32,
    textAlign: "center",
  },
  calDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  calDayCell: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    borderRadius: 16,
  },
  calDayCellSelected: {
    backgroundColor: "#0284c7",
  },
  calDayText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  calDayTextSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
