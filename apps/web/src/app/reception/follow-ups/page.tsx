"use client";
import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Search,
  Filter,
  Phone,
  Clock,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  X,
  Stethoscope,
  CalendarPlus,
  RotateCcw,
} from "lucide-react";
import AnalogClockPicker from "@/components/AnalogClockPicker";
export interface FollowUpItem {
  id: string;
  appointmentId: string;
  mrn: string;
  patientName: string;
  phone: string;
  doctorName: string;
  doctorId: string;
  branch: string;
  dueDate: string;
  dueTime: number;
  dueMonth: number;
  dueYear: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isThisMonth: boolean;
  isNextMonth: boolean;
  followUpInterval: string;
  status: "Due Today" | "Overdue" | "Upcoming" | "Confirmed" | "Scheduled" | "Completed";
  notes: string;
  consultationFee: number;
  prescriptionImages?: string[];
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

function ReceptionFollowUpsContent() {
  const router = useRouter();
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [branches, setBranches] = useState<string[]>([
    "All Branches",
    "KPHB Branch",
    "Chandanagar Branch",
    "Nallagandla Branch",
    "Dilshuknagar Branch",
  ]);
  const [branchName, setBranchName] = useState("Spiritual Homeopathy Clinic");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [statusFilter, setStatusFilter] = useState("All");

  // Period / Month Filters: "all", "overdue", "this_month", "next_month", "due_today", "month", "range"
  const [periodFilter, setPeriodFilter] = useState<"all" | "overdue" | "this_month" | "next_month" | "due_today" | "month" | "range">("this_month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Modals state
  const [rescheduleItem, setRescheduleItem] = useState<FollowUpItem | null>(null);
  const [bookingItem, setBookingItem] = useState<FollowUpItem | null>(null);

  // Form state for Reschedule
  const [newDueDate, setNewDueDate] = useState("");
  const [newInterval, setNewInterval] = useState("1 Month");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Form state for Book Appointment
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

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Pagination (Default 35 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(35);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Summary counts
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    thisMonth: 0,
    nextMonth: 0,
    completed: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem("branch_name");
    if (saved) {
      setBranchName(saved);
      // Pre-select local branch if in the list or keep All Branches
    }
  }, []);

  // Fetch live follow-ups from database
  const fetchFollowUps = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("pageSize", String(pageSize));
        params.set("period", periodFilter);
        if (periodFilter === "month" && selectedMonth) {
          params.set("selectedMonth", selectedMonth);
        }
        if (periodFilter === "range") {
          if (startDate) params.set("startDate", startDate);
          if (endDate) params.set("endDate", endDate);
        }

        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (selectedBranch && selectedBranch !== "All Branches") params.set("branch", selectedBranch);
        if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

        const res = await fetch(`/api/reception/follow-ups?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch follow-ups");
        const data = await res.json();

        if (data.success) {
          setFollowUps(data.followUps || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          if (data.branches && Array.isArray(data.branches)) {
            setBranches(data.branches);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error("Error fetching reception follow-ups:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, periodFilter, searchTerm, selectedBranch, statusFilter, selectedMonth, startDate, endDate]
  );

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Debounced search handling
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentPage(1);
  };

  const handlePeriodChange = (period: "all" | "overdue" | "this_month" | "next_month" | "due_today" | "month" | "range") => {
    setPeriodFilter(period);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Open Reschedule Modal
  const openRescheduleModal = (item: FollowUpItem) => {
    setRescheduleItem(item);
    // Convert DD-MM-YYYY to YYYY-MM-DD for standard html date picker
    const parts = (item.dueDate || "").split("-");
    if (parts.length === 3) {
      setNewDueDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      setNewDueDate(new Date().toISOString().slice(0, 10));
    }
    setNewInterval(item.followUpInterval || "1 Month");
    setRescheduleNotes(item.notes || "");
  };

  // Submit Reschedule
  const handleSaveReschedule = async () => {
    if (!rescheduleItem || !newDueDate) return;
    setSavingReschedule(true);
    try {
      const res = await fetch("/api/reception/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: rescheduleItem.appointmentId,
          newFollowUpDate: newDueDate,
          newInterval,
          notes: rescheduleNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Follow-up for ${rescheduleItem.patientName} successfully rescheduled!`);
        setTimeout(() => setActionMessage(null), 4000);
        setRescheduleItem(null);
        fetchFollowUps(true);
      } else {
        alert(data.error || "Failed to reschedule follow-up");
      }
    } catch (err: any) {
      alert(err.message || "Error rescheduling follow-up");
    } finally {
      setSavingReschedule(false);
    }
  };

  // Open Book Appointment Modal
  const openBookingModal = (item: FollowUpItem) => {
    setBookingItem(item);
    const initialBranch =
      item.branch ||
      (branchName && branchName !== "Spiritual Homeopathy Clinic" && branchName !== "All Branches"
        ? branchName
        : "KPHB Branch");
    setBookBranch(initialBranch);
    setBookDoctorId(item.doctorId || "1793864791241");
    setBookDoctorName(item.doctorName || "Dr. Prashanth K Vaidya");

    // Convert DD-MM-YYYY to YYYY-MM-DD
    let initDate = "";
    const parts = (item.dueDate || "").split("-");
    if (parts.length === 3) {
      initDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      initDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    }
    setBookDate(initDate);
    setBookTimeSlot("");
    setBookMode("In-Clinic");
    setBookReason(`Follow-up review for ${item.patientName}`);
    setBookNotes(item.notes || "Booked from reception follow-up queue");
  };

  // Fetch doctors and active no-shows for Book Appointment based on branch, date, and mode
  useEffect(() => {
    if (!bookingItem || !bookDate) return;

    let isMounted = true;
    setLoadingBookingDoctors(true);

    if (bookMode === "Online") {
      // Online mode: Fetch ALL clinic doctors across all branches
      fetch("/api/admin/employees?category=DOCTOR")
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          const docList = Array.isArray(data.employees) ? data.employees : [];
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
            const match = mapped.find((d: any) => d.id === bookDoctorId || d.name === bookDoctorName);
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

    // In-Clinic mode: Fetch branch doctors and active no-shows for this date
    const day = getDayOfWeekAbbr(bookDate);
    const cleanBranch = bookBranch.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

    let dtFormatted = bookDate;
    if (bookDate.includes("-")) {
      const p = bookDate.split("-");
      if (p[0].length === 4) {
        dtFormatted = `${p[2]}-${p[1]}-${p[0]}`;
      }
    }

    Promise.all([
      fetch(`/api/admin/doctor-timings?branch=${encodeURIComponent(cleanBranch)}&day=${day}`).then((r) => r.json()),
      fetch(`/api/reception/doctor-no-show?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dtFormatted)}`).then((r) => r.json()),
    ])
      .then(([timingsData, noShowData]) => {
        if (!isMounted) return;
        let noShows: any[] = [];
        if (noShowData && noShowData.success && Array.isArray(noShowData.noShows)) {
          noShows = noShowData.noShows;
        }
        setActiveBookingNoShows(noShows);

        let doctors: any[] = [];
        if (timingsData && timingsData.success && Array.isArray(timingsData.doctors)) {
          doctors = timingsData.doctors;
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
        console.error("Error fetching booking doctors:", err);
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
    let dtFormatted = bookDate;
    if (bookDate.includes("-")) {
      const p = bookDate.split("-");
      if (p[0].length === 4) {
        dtFormatted = `${p[2]}-${p[1]}-${p[0]}`;
      }
    }
    const cleanBranch = bookBranch.replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

    fetch(
      `/api/reception/appointments?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dtFormatted)}&doctorId=${encodeURIComponent(bookDoctorId)}`
    )
      .then((r) => r.json())
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

  // Submit Book Appointment
  const handleConfirmBooking = async () => {
    if (!bookingItem || !bookDate || !bookTimeSlot) return;
    setSavingBooking(true);
    try {
      let dtFormatted = bookDate;
      if (bookDate.includes("-")) {
        const p = bookDate.split("-");
        if (p[0].length === 4) {
          dtFormatted = `${p[2]}-${p[1]}-${p[0]}`;
        }
      }

      const res = await fetch("/api/reception/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: bookingItem.mrn,
          patientName: bookingItem.patientName,
          phoneNumber: bookingItem.phone,
          branch: bookMode === "Online" ? "Online Consultation" : bookBranch,
          doctorId: bookDoctorId,
          doctorName: bookDoctorName,
          appointmentDate: dtFormatted,
          selectedTimeSlot: bookTimeSlot,
          consultationMode: bookMode,
          diseases: bookReason,
          notes: bookNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Appointment successfully booked for ${bookingItem.patientName} on ${dtFormatted} (${bookTimeSlot})!`);
        setTimeout(() => setActionMessage(null), 4500);
        setBookingItem(null);
        fetchFollowUps(true);
      } else {
        alert(data.error || "Failed to book appointment");
      }
    } catch (err: any) {
      alert(err.message || "Error booking appointment");
    } finally {
      setSavingBooking(false);
    }
  };

  // Real Excel / CSV Export
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.set("export", "true");
      params.set("period", periodFilter);
      if (periodFilter === "month" && selectedMonth) params.set("selectedMonth", selectedMonth);
      if (periodFilter === "range") {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedBranch && selectedBranch !== "All Branches") params.set("branch", selectedBranch);
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/reception/follow-ups?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;
      const data = await res.json();
      const exportList: FollowUpItem[] = data.followUps || followUps;

      if (exportList.length === 0) return;

      const headers = [
        "Follow-Up ID",
        "MRN",
        "Patient Name",
        "Phone",
        "Attending Doctor",
        "Branch",
        "Follow-Up Due Date",
        "Interval",
        "Status",
      ];

      const rows = exportList.map((f) => [
        `"${f.id}"`,
        `"${f.mrn}"`,
        `"${f.patientName.replace(/"/g, '""')}"`,
        `"${f.phone}"`,
        `"${f.doctorName.replace(/"/g, '""')}"`,
        `"${f.branch}"`,
        `"${f.dueDate}"`,
        `"${f.followUpInterval}"`,
        `"${f.status}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const nowStr = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SPH_Reception_FollowUps_${periodFilter}_${nowStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn("Failed to export follow-ups CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  // Direct WhatsApp Message
  const handleWhatsApp = (f: FollowUpItem) => {
    const cleanPhone = f.phone.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("No valid phone number for WhatsApp message");
      return;
    }
    const message = encodeURIComponent(
      `Hello ${f.patientName},\nThis is a gentle follow-up reminder from Spiritual Homeopathy Clinics (${f.branch}).\nYour follow-up consultation with ${f.doctorName} is scheduled on ${f.dueDate}.\nPlease reply to confirm or reschedule your visit.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <ReceptionSidebar activePage="follow-ups" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Header Bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Patient Follow-Ups & Reminders
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Queue
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {branchName} • Follow-up schedule with direct rescheduling, booking, and branch trajectory
              </p>
            </div>

            {/* Actions: Search, Branch Filter, Status Filter, Refresh, Excel Export */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, phone, MRN..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-48 sm:w-56"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Branch Filter (Branch-wise) */}
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Due Today">Due Today</option>
                <option value="Overdue">Overdue</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchFollowUps(true)}
                disabled={loading || refreshing}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-sky-600" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Export Excel / CSV Button */}
              <button
                onClick={handleExportCSV}
                disabled={exporting || followUps.length === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? "Exporting..." : "Export Excel"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Action notification toast */}
        {actionMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Period Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">
                Period Filter:
              </span>

              {/* This Month (FIRST & DEFAULT) */}
              <button
                onClick={() => handlePeriodChange("this_month")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${periodFilter === "this_month"
                    ? "bg-sky-600 text-white shadow-2xs shadow-sky-200"
                    : "bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200"
                  }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>This Month</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${periodFilter === "this_month" ? "bg-white/25 text-white" : "bg-sky-200 text-sky-800"
                    }`}
                >
                  {stats.thisMonth}
                </span>
              </button>

              {/* Next Month */}
              <button
                onClick={() => handlePeriodChange("next_month")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${periodFilter === "next_month"
                    ? "bg-indigo-600 text-white shadow-2xs shadow-indigo-200"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200"
                  }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Next Month</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${periodFilter === "next_month" ? "bg-white/25 text-white" : "bg-indigo-200 text-indigo-800"
                    }`}
                >
                  {stats.nextMonth}
                </span>
              </button>

              {/* Due Today */}
              <button
                onClick={() => handlePeriodChange("due_today")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${periodFilter === "due_today"
                    ? "bg-amber-600 text-white shadow-2xs shadow-amber-200"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Due Today</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${periodFilter === "due_today" ? "bg-white/25 text-white" : "bg-amber-200 text-amber-900"
                    }`}
                >
                  {stats.dueToday}
                </span>
              </button>

              {/* Overdue (Follow-up date passed) */}
              <button
                onClick={() => handlePeriodChange("overdue")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${periodFilter === "overdue"
                    ? "bg-rose-600 text-white shadow-2xs shadow-rose-200"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                  }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Overdue (Date Passed)</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${periodFilter === "overdue" ? "bg-white/25 text-white" : "bg-rose-200 text-rose-800"
                    }`}
                >
                  {stats.overdue}
                </span>
              </button>

              {/* Choose Month */}
              <button
                onClick={() => handlePeriodChange("month")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === "month"
                    ? "bg-purple-600 text-white shadow-2xs shadow-purple-200"
                    : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Choose Month</span>
                {periodFilter === "month" && selectedMonth && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-purple-800 text-white font-mono">
                    {selectedMonth}
                  </span>
                )}
              </button>

              {/* Date Range */}
              <button
                onClick={() => handlePeriodChange("range")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  periodFilter === "range"
                    ? "bg-teal-600 text-white shadow-2xs shadow-teal-200"
                    : "bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200"
                }`}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Date Range</span>
                {periodFilter === "range" && (startDate || endDate) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-teal-800 text-white">
                    Active
                  </span>
                )}
              </button>

              {/* All Follow-Ups (MOVED TO LAST) */}
              <button
                onClick={() => handlePeriodChange("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${periodFilter === "all"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
              >
                <span>All Follow-Ups</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-white/20 text-current font-extrabold">
                  {stats.total}
                </span>
              </button>
            </div>

            {/* Pagination Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-md border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={35}>35 (Default)</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Extended controls for Choose Month */}
            {periodFilter === "month" && (
              <div className="w-full pt-2.5 mt-1 border-t border-slate-100 flex items-center gap-3 flex-wrap bg-purple-50/50 p-2.5 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Select Specific Month:</span>
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-purple-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Showing follow-ups scheduled in month: <strong className="text-purple-800">{selectedMonth}</strong>
                </span>
              </div>
            )}

            {/* Extended controls for Date Range */}
            {periodFilter === "range" && (
              <div className="w-full pt-2.5 mt-1 border-t border-slate-100 flex items-center gap-3 flex-wrap bg-teal-50/50 p-2.5 rounded-lg">
                <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>Choose Date Range:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-teal-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-teal-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 transition"
                  >
                    Clear Range
                  </button>
                )}
                <span className="text-[11px] text-slate-500 font-semibold">
                  Showing follow-ups between <strong className="text-teal-800">{startDate || "Start"}</strong> and <strong className="text-teal-800">{endDate || "End"}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Follow-Ups Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2 px-2 w-10 text-center">S.No</th>
                    <th className="py-2 px-3">Patient MRN & Name</th>
                    <th className="py-2 px-2.5">Phone</th>
                    <th className="py-2 px-2.5">Branch</th>
                    <th className="py-2 px-3">Attending Doctor</th>
                    <th className="py-2 px-2.5 text-center">Follow-Up Due Date</th>
                    <th className="py-2 px-3 text-center">Action Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                          <span className="font-bold text-xs text-slate-600">Loading follow-ups...</span>
                        </div>
                      </td>
                    </tr>
                  ) : followUps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CalendarCheck className="w-8 h-8 text-slate-300" />
                          <span className="font-bold text-slate-700 text-sm">No follow-ups found</span>
                          <span className="text-xs text-slate-400 max-w-sm">
                            No patient follow-ups match the selected period, branch, or search criteria.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    followUps.map((item, idx) => {
                      const sNo = (currentPage - 1) * pageSize + idx + 1;
                      const cleanPhone = item.phone.replace(/\D/g, "");

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-sky-50/40 transition-colors group"
                        >
                          {/* S.No */}
                          <td className="py-2 px-2 text-center text-slate-400 font-bold text-[10px]">
                            {sNo}
                          </td>

                          {/* Patient MRN & Name */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {item.patientName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center gap-1 text-[11.5px]">
                                  <span>{item.patientName}</span>
                                </div>
                                <div className="text-[9.5px] font-mono text-slate-500 font-semibold">
                                  {item.mrn}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1 text-slate-700 font-semibold text-[10.5px]">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{cleanPhone || "—"}</span>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1 text-slate-600 font-semibold text-[10.5px]">
                              <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[110px]">{item.branch}</span>
                            </div>
                          </td>

                          {/* Attending Doctor */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 text-slate-800 font-bold text-[11px]">
                              <Stethoscope className="w-3 h-3 text-sky-600 shrink-0" />
                              <span className="truncate max-w-[140px]">{item.doctorName}</span>
                            </div>
                          </td>

                          {/* Follow-Up Due Date */}
                          <td className="py-2 px-2.5 text-center">
                            <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[10.5px]">
                              <Calendar className="w-2.5 h-2.5 text-slate-500" />
                              <span>{item.dueDate}</span>
                            </div>
                          </td>

                          {/* Action Options: Reschedule & Book Appointment */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Reschedule Button */}
                              <button
                                onClick={() => openRescheduleModal(item)}
                                className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Reschedule Follow-Up Date"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Reschedule</span>
                              </button>

                              {/* Book Appointment Button */}
                              <button
                                onClick={() => openBookingModal(item)}
                                className="px-2 py-0.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10.5px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Book Clinical Appointment"
                              >
                                <CalendarPlus className="w-2.5 h-2.5" />
                                <span>Book Appointment</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs font-semibold text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {followUps.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{" "}
                of <span className="font-bold text-slate-900">{totalCount}</span> follow-up records
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-800 shadow-2xs">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || loading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* POPUP MODAL 1: Reschedule Follow-up */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Reschedule Follow-Up</h3>
                  <p className="text-[11px] text-blue-100">
                    Patient: {rescheduleItem.patientName} ({rescheduleItem.mrn})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-medium text-slate-700">
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between">
                <span>Current Follow-Up Due Date:</span>
                <span className="font-black font-mono">{rescheduleItem.dueDate}</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  New Follow-Up Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Follow-Up Interval
                </label>
                <select
                  value={newInterval}
                  onChange={(e) => setNewInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="1 Week">1 Week</option>
                  <option value="2 Weeks">2 Weeks</option>
                  <option value="3 Weeks">3 Weeks</option>
                  <option value="1 Month">1 Month</option>
                  <option value="45 Days">45 Days</option>
                  <option value="2 Months">2 Months</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Reschedule Notes / Reason
                </label>
                <textarea
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  rows={2}
                  placeholder="Patient requested postponement, traveling, etc."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReschedule}
                  disabled={savingReschedule || !newDueDate}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {savingReschedule ? "Updating..." : "Save Rescheduled Date"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: Book Appointment Directly */}
      {bookingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Book Follow-Up Appointment</h3>
                  <p className="text-[11px] text-sky-100">
                    Patient: {bookingItem.patientName} • {bookingItem.mrn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookingItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs font-medium text-slate-700 max-h-[82vh] overflow-y-auto">
              {/* Patient info bar */}
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between text-sky-950">
                <div>
                  <span className="font-black text-slate-900">{bookingItem.patientName}</span>
                  <span className="ml-2 text-slate-500 font-mono">({bookingItem.phone})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-sky-200 text-sky-900 font-bold text-[10px]">
                    {bookingItem.mrn}
                  </span>
                  {bookBranch && bookMode === "In-Clinic" && (
                    <span className="px-2 py-0.5 rounded bg-white text-sky-800 font-bold text-[10px] border border-sky-200">
                      {bookBranch}
                    </span>
                  )}
                </div>
              </div>

              {/* Consultation Mode (In-Clinic vs Online) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Consultation Mode <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CONSULTATION_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setBookMode(m.id as "In-Clinic" | "Online");
                        setBookTimeSlot("");
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        bookMode === m.id
                          ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${bookMode === m.id ? "bg-sky-600" : "bg-slate-300"}`} />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Consultant Doctor <span className="text-rose-500">*</span>
                  </label>
                  {loadingBookingDoctors ? (
                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                      <span>Loading doctors...</span>
                    </div>
                  ) : bookingAvailableDoctors.length === 0 ? (
                    <div className="w-full px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-[11px] text-rose-700 font-bold">
                      {bookMode === "Online"
                        ? "No online doctors available"
                        : `No doctors scheduled at ${bookBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}`}
                    </div>
                  ) : (
                    <select
                      value={bookDoctorId}
                      onChange={(e) => {
                        setBookDoctorId(e.target.value);
                        const doc = bookingAvailableDoctors.find((d: any) => (d.doctorId || d.id) === e.target.value);
                        if (doc) setBookDoctorName(doc.doctorName || doc.name);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      {bookingAvailableDoctors.map((doc: any) => (
                        <option key={doc.doctorId || doc.id} value={doc.doctorId || doc.id}>
                          {doc.doctorName || doc.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* TIME SELECTION: ANALOG CLOCK FOR ONLINE, 15-MIN GRID FOR IN-CLINIC */}
              {bookMode === "Online" ? (
                <div>
                  <AnalogClockPicker
                    value={bookTimeSlot}
                    onChange={setBookTimeSlot}
                    doctorName={bookDoctorName}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Select Time Slot (15-min intervals) *
                    </label>
                    {bookTimeSlot && (
                      <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        Selected: {bookTimeSlot}
                      </span>
                    )}
                  </div>

                  {bookingSlotSessions.length === 0 ? (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-800 font-medium">
                      {bookingAvailableDoctors.length === 0
                        ? `No doctors scheduled at ${bookBranch.replace(" Branch", "")} on ${getDayOfWeekAbbr(bookDate)}.`
                        : !bookDoctorId
                        ? "Please select a doctor to view their consultation slots."
                        : `No consultation slots configured for ${bookDoctorName} on this day.`}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-56 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                      {bookingSlotSessions.map((session: any) => (
                        <div key={session.id} className="space-y-1.5">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                            <span className="text-[11px] font-extrabold text-slate-800">
                              {session.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {session.slots.length} slots
                            </span>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                            {session.slots.map((slot: any) => {
                              const isSelected = bookTimeSlot === slot.time;
                              const disabled = slot.isFull || slot.isNoShow;
                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => setBookTimeSlot(slot.time)}
                                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all border ${
                                    disabled
                                      ? "bg-red-50 border-red-200 text-red-600 opacity-60 cursor-not-allowed"
                                      : isSelected
                                      ? "bg-sky-600 border-sky-600 text-white shadow-2xs"
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
                                  }`}
                                >
                                  <span className={`text-[10.5px] font-bold ${isSelected ? "text-white" : ""}`}>
                                    {slot.time}
                                  </span>
                                  {slot.isNoShow ? (
                                    <span className="text-[7.5px] font-extrabold uppercase px-1 rounded bg-red-600 text-white mt-0.5">
                                      NO-SHOW
                                    </span>
                                  ) : slot.isFull ? (
                                    <span className="text-[7.5px] font-extrabold uppercase px-1 rounded bg-red-500 text-white mt-0.5">
                                      FULL
                                    </span>
                                  ) : (
                                    <span className={`text-[8.5px] ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                                      ({slot.bookedCount}/3)
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reason / Complaints */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Reason for Visit / Condition
                </label>
                <input
                  type="text"
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  placeholder="Follow-up consultation, medication refill, symptom review"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Booking Remarks
                </label>
                <textarea
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes from receptionist..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBookingItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={savingBooking || !bookDate || !bookTimeSlot}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {savingBooking ? "Booking..." : "Confirm & Book Slot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceptionFollowUpsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-slate-400 font-semibold text-xs">
          Loading Follow-ups & Reminders...
        </div>
      }
    >
      <ReceptionFollowUpsContent />
    </Suspense>
  );
}
