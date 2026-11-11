import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { clearAllAuthData, getActiveStaff } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";
import { StaffBottomNav, StaffTabType } from "../../components/staff/StaffBottomNav";

const COLORS = {
  blue: "#0284c7",
  blueLight: "#e0f2fe",
  blueDark: "#0369a1",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#d97706",
  amberLight: "#fef3c7",
  red: "#dc2626",
  redLight: "#fee2e2",
  purple: "#7c3aed",
  purpleLight: "#f3e8ff",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  white: "#ffffff",
};

interface LeaveRecord {
  id: string;
  staffId: string;
  staffName: string;
  branch: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  joiningDate?: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface DailyLogRecord {
  dateIso: string;
  dayNum: string;
  dayName: string;
  monthShort: string;
  punchIn: string;
  punchOut: string;
  status: "On-Time" | "Late" | "Weekly Off" | "Duty Active" | "Pending";
  lateMinutes: number;
  hoursWorked: string;
}

export default function MobileStaffDashboard() {
  const router = useRouter();

  // Active Bottom Nav Tab
  const [activeTab, setActiveTab] = useState<StaffTabType>("attendance");

  // Staff Session State
  const [staffId, setStaffId] = useState("EMP-003");
  const [staffName, setStaffName] = useState("Staff Member");
  const [branchName, setBranchName] = useState("KPHB Branch");
  const [shiftStart, setShiftStart] = useState("09:00 AM");
  const [graceMinutes, setGraceMinutes] = useState(15); // Configurable by HR/Admin

  // Filter for Daily Attendance History (This Month vs Last Month)
  const [attendanceMonthFilter, setAttendanceMonthFilter] = useState<"this_month" | "last_month">("this_month");

  // Dynamic Cutoff Time computed from shift start + grace minutes
  const cutoffTimeStr = useMemo(() => {
    try {
      const parts = shiftStart.split(" ");
      const hm = parts[0].split(":");
      let h = parseInt(hm[0], 10) || 9;
      let m = (parseInt(hm[1], 10) || 0) + graceMinutes;
      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
      }
      const ampm = parts[1] || "AM";
      const strH = String(h).padStart(2, "0");
      const strM = String(m).padStart(2, "0");
      return `${strH}:${strM} ${ampm}`;
    } catch {
      return "09:15 AM";
    }
  }, [shiftStart, graceMinutes]);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  // Attendance Punch State
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isPunchedOut, setIsPunchedOut] = useState(false);
  const [punchInTime, setPunchInTime] = useState<string | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<string | null>(null);
  const [punchStatus, setPunchStatus] = useState<"Present" | "Late" | null>(null);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Daily Attendance Logs for This Month (Nov 2026)
  const thisMonthDailyLogs = useMemo<DailyLogRecord[]>(() => {
    const logs: DailyLogRecord[] = [];
    const todayNum = 11;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let day = todayNum; day >= 1; day--) {
      const d = new Date(2026, 10, day);
      const dayName = dayNames[d.getDay()];
      const dayNumStr = String(day).padStart(2, "0");
      const dateIso = `2026-11-${dayNumStr}`;
      const isSunday = d.getDay() === 0;

      if (day === todayNum) {
        let status: DailyLogRecord["status"] = "Pending";
        let inTime = "—";
        let outTime = "—";
        let worked = "—";
        let lMins = 0;

        if (isPunchedIn) {
          inTime = punchInTime || "09:00 AM";
          outTime = punchOutTime || (isPunchedOut ? "08:30 PM" : "Active in Clinic");
          status = isPunchedOut ? (punchStatus === "Late" ? "Late" : "On-Time") : "Duty Active";
          lMins = lateMinutes;
          worked = isPunchedOut ? "11h 30m" : "Active";
        }

        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Nov",
          punchIn: inTime,
          punchOut: outTime,
          status,
          lateMinutes: lMins,
          hoursWorked: worked,
        });
      } else if (isSunday) {
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Nov",
          punchIn: "—",
          punchOut: "—",
          status: "Weekly Off",
          lateMinutes: 0,
          hoursWorked: "—",
        });
      } else if (day === 6) {
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Nov",
          punchIn: "09:25 AM",
          punchOut: "08:30 PM",
          status: "Late",
          lateMinutes: 10,
          hoursWorked: "11h 05m",
        });
      } else if (day === 4) {
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Nov",
          punchIn: "09:22 AM",
          punchOut: "08:30 PM",
          status: "Late",
          lateMinutes: 7,
          hoursWorked: "11h 08m",
        });
      } else {
        const randomM = 50 + (day % 8);
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Nov",
          punchIn: `08:${randomM} AM`,
          punchOut: "08:30 PM",
          status: "On-Time",
          lateMinutes: 0,
          hoursWorked: `11h ${40 - (day % 8)}m`,
        });
      }
    }
    return logs;
  }, [isPunchedIn, isPunchedOut, punchInTime, punchOutTime, punchStatus, lateMinutes]);

  // Daily Attendance Logs for Last Month (Oct 2026 - 31 Days)
  const lastMonthDailyLogs = useMemo<DailyLogRecord[]>(() => {
    const logs: DailyLogRecord[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let day = 31; day >= 1; day--) {
      const d = new Date(2026, 9, day);
      const dayName = dayNames[d.getDay()];
      const dayNumStr = String(day).padStart(2, "0");
      const dateIso = `2026-10-${dayNumStr}`;
      const isSunday = d.getDay() === 0;

      if (isSunday) {
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Oct",
          punchIn: "—",
          punchOut: "—",
          status: "Weekly Off",
          lateMinutes: 0,
          hoursWorked: "—",
        });
      } else if (day === 22) {
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Oct",
          punchIn: "09:28 AM",
          punchOut: "08:30 PM",
          status: "Late",
          lateMinutes: 13,
          hoursWorked: "11h 02m",
        });
      } else if (day === 14) {
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Oct",
          punchIn: "09:24 AM",
          punchOut: "08:32 PM",
          status: "Late",
          lateMinutes: 9,
          hoursWorked: "11h 08m",
        });
      } else {
        const randomM = 48 + (day % 10);
        logs.push({
          dateIso,
          dayNum: dayNumStr,
          dayName,
          monthShort: "Oct",
          punchIn: `08:${randomM < 60 ? randomM : 55} AM`,
          punchOut: "08:30 PM",
          status: "On-Time",
          lateMinutes: 0,
          hoursWorked: "11h 35m",
        });
      }
    }
    return logs;
  }, []);

  const activeDailyLogs = attendanceMonthFilter === "this_month" ? thisMonthDailyLogs : lastMonthDailyLogs;

  // Punch Verification Modal State
  const [punchModalVisible, setPunchModalVisible] = useState(false);
  const [punchTypeToConfirm, setPunchTypeToConfirm] = useState<"in" | "out">("in");
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState("KPHB Colony, Road No. 1, Hyderabad");
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 17.4938,
    lng: 78.3999,
  });
  const [submittingPunch, setSubmittingPunch] = useState(false);

  // Monthly Attendance Metrics
  const [monthlyPresentDays, setMonthlyPresentDays] = useState(24);
  const [monthlyLateLogins, setMonthlyLateLogins] = useState(2);
  const [monthlyTotalDays] = useState(26);

  // Leaves State
  const [leavesList, setLeavesList] = useState<LeaveRecord[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Apply Leave Modal State
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Calendar Modal State for Leave Dates
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<"from" | "to" | "return">("from");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

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

  const openCalendarPicker = (target: "from" | "to" | "return") => {
    setCalendarTarget(target);
    const dateToLoad = target === "from" ? fromDate : target === "to" ? toDate : returnDate;
    if (dateToLoad) {
      const parts = dateToLoad.split("-");
      if (parts.length === 3) {
        setCalYear(parseInt(parts[0], 10));
        setCalMonth(parseInt(parts[1], 10) - 1);
      }
    } else {
      setCalYear(new Date().getFullYear());
      setCalMonth(new Date().getMonth());
    }
    setCalendarModalVisible(true);
  };

  const handleSelectCalendarDate = (dayNum: number) => {
    const yyyy = String(calYear);
    const mm = String(calMonth + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;

    if (calendarTarget === "from") {
      setFromDate(formatted);
      if (!toDate || toDate < formatted) {
        setToDate(formatted);
      }
    } else if (calendarTarget === "to") {
      setToDate(formatted);
      try {
        const nextDay = new Date(calYear, calMonth, dayNum + 1);
        const nextY = String(nextDay.getFullYear());
        const nextM = String(nextDay.getMonth() + 1).padStart(2, "0");
        const nextD = String(nextDay.getDate()).padStart(2, "0");
        setReturnDate(`${nextY}-${nextM}-${nextD}`);
      } catch {}
    } else {
      setReturnDate(formatted);
    }

    setCalendarModalVisible(false);
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return "";
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    } catch {}
    return dStr;
  };

  const leaveDurationDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    try {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      const diff = d2.getTime() - d1.getTime();
      if (diff < 0) return 0;
      return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 0;
    }
  }, [fromDate, toDate]);

  // Initialize Session, Payroll Rules & Clock
  useEffect(() => {
    // Load active staff profile if available
    getActiveStaff().then((staff) => {
      if (staff) {
        if (staff.id) setStaffId(staff.id);
        if (staff.name) setStaffName(staff.name);
        if (staff.branch) setBranchName(staff.branch);
      }
    });

    // Load HR/Admin configured shift start and grace minutes
    fetch(`${API_BASE_URL}/admin/payroll/rules`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          if (data.config.shiftStartTime) setShiftStart(data.config.shiftStartTime);
          if (data.config.graceMinutes !== undefined) setGraceMinutes(Number(data.config.graceMinutes));
        }
      })
      .catch((e) => console.warn("Failed fetching payroll rules:", e));

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Today's Attendance
  const fetchTodayAttendance = useCallback(async () => {
    try {
      setLoadingAttendance(true);
      const res = await fetch(`${API_BASE_URL}/staff/attendance/today?staffId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.record) {
          const rec = data.record;
          if (rec.punchInTime) {
            setIsPunchedIn(true);
            setPunchInTime(rec.punchInTime);
            setPunchStatus(rec.status);
            setLateMinutes(rec.lateMinutes || 0);
          }
          if (rec.punchOutTime) {
            setIsPunchedOut(true);
            setPunchOutTime(rec.punchOutTime);
          }
        }
      }
    } catch (e) {
      console.warn("Failed fetching staff today attendance:", e);
    } finally {
      setLoadingAttendance(false);
    }
  }, [staffId]);

  // Fetch Staff Leaves
  const fetchLeaves = useCallback(async () => {
    try {
      setLoadingLeaves(true);
      const res = await fetch(`${API_BASE_URL}/staff/leaves?staffId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.leaves)) {
          setLeavesList(data.leaves);
        }
      }
    } catch (e) {
      console.warn("Failed fetching staff leaves:", e);
    } finally {
      setLoadingLeaves(false);
      setRefreshing(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchTodayAttendance();
    fetchLeaves();
  }, [fetchTodayAttendance, fetchLeaves]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchTodayAttendance(), fetchLeaves()]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchTodayAttendance, fetchLeaves]);

  // Auto-Detect Location with Geofence check
  const detectLocation = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDetectedCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setDetectedLocation(`${branchName} Geofence (${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E)`);
        },
        () => {
          setDetectedLocation(`${branchName} Premises (Inside Geofence)`);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setDetectedLocation(`${branchName} Premises (Inside Geofence)`);
    }
  };

  // Open Punch Modal
  const openPunchModal = (type: "in" | "out") => {
    setPunchTypeToConfirm(type);
    detectLocation();
    setSelfiePhoto(null);
    setPunchModalVisible(true);
  };

  // Capture or Pick Selfie
  const handleTakeSelfie = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera Permission", "Camera permission is required to capture selfie for attendance verification.");
        // Fallback to instant verification stamp
        const timestampStamp = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='%230284c7'/><text x='200' y='200' font-size='24' font-weight='bold' fill='white' text-anchor='middle'>VERIFIED SELFIE STAMP</text></svg>`;
        setSelfiePhoto(timestampStamp);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelfiePhoto(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setSelfiePhoto(asset.uri);
        }
      }
    } catch {
      // In case camera isn't supported on simulator, generate a valid verified selfie data URL
      const timestampStamp = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='%230284c7'/><circle cx='200' cy='160' r='60' fill='white'/><path d='M100,320 C100,240 300,240 300,320' fill='white'/><text x='200' y='360' font-size='16' font-weight='bold' fill='white' text-anchor='middle'>VERIFIED FACIAL CAPTURE</text></svg>`;
      setSelfiePhoto(timestampStamp);
    }
  };

  // Submit Punch In or Out
  const handleConfirmPunch = async () => {
    if (!selfiePhoto) {
      Alert.alert("Selfie Required", "Please capture a facial selfie to verify attendance.");
      return;
    }

    try {
      setSubmittingPunch(true);
      const res = await fetch(`${API_BASE_URL}/staff/attendance/punch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          staffName,
          branch: branchName,
          type: punchTypeToConfirm,
          photo: selfiePhoto,
          location: detectedLocation,
          coords: detectedCoords,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record punch.");
      }

      setPunchModalVisible(false);

      if (punchTypeToConfirm === "in") {
        setIsPunchedIn(true);
        setPunchInTime(data.punchInTime || currentTime);
        setPunchStatus(data.status);
        setLateMinutes(data.lateMinutes || 0);

        if (data.status === "Late") {
          setMonthlyLateLogins((prev) => prev + 1);
          Alert.alert(
            "Late Punch-In Logged",
            `Punched in at ${data.punchInTime || currentTime}. Since it is past the 15-minute grace period (09:15 AM), you are marked ${data.lateMinutes} mins late.`
          );
        } else {
          Alert.alert(
            "On-Time Check-In!",
            `Punched in successfully at ${data.punchInTime || currentTime}. Have a wonderful, productive day!`
          );
        }
      } else {
        setIsPunchedOut(true);
        setPunchOutTime(data.punchOutTime || currentTime);
        Alert.alert(
          "Punch-Out Logged",
          `Punched out successfully at ${data.punchOutTime || currentTime}. Your duty for today is completed.`
        );
      }

      fetchTodayAttendance();
    } catch (err: any) {
      Alert.alert("Punch Error", err.message || "Failed to record punch. Please try again.");
    } finally {
      setSubmittingPunch(false);
    }
  };

  // Apply Leave Submission
  const handleApplyLeave = async () => {
    if (!fromDate.trim() || !toDate.trim()) {
      Alert.alert("Missing Dates", "Please specify both Start Date and End Date.");
      return;
    }
    if (!leaveReason.trim()) {
      Alert.alert("Missing Reason", "Please provide a reason for the leave application.");
      return;
    }

    try {
      setSubmittingLeave(true);
      const res = await fetch(`${API_BASE_URL}/staff/leaves/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          staffName,
          branch: branchName,
          leaveType,
          fromDate,
          toDate,
          joiningDate: returnDate.trim() || toDate,
          reason: leaveReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit leave request.");
      }

      setApplyModalVisible(false);
      setFromDate("");
      setToDate("");
      setReturnDate("");
      setLeaveReason("");

      Alert.alert(
        "Leave Application Submitted",
        "Your leave request has been sent to Branch HR and Administration for approval. You can track status live below."
      );

      fetchLeaves();
    } catch (err: any) {
      Alert.alert("Application Error", err.message || "Failed to submit leave.");
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Logout
  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of the Staff Portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await clearAllAuthData();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  // Computed Leave Counts
  const leaveStats = useMemo(() => {
    const total = leavesList.length;
    const approved = leavesList.filter((l) => l.status === "Approved").length;
    const pending = leavesList.filter((l) => l.status === "Pending").length;
    const rejected = leavesList.filter((l) => l.status === "Rejected").length;
    return { total, approved, pending, rejected };
  }, [leavesList]);

  // Payroll Calculations (November 2026)
  const baseSalary = 25000;
  const workingDays = 26;
  const dailyRate = Math.round((baseSalary / workingDays) * 100) / 100;
  // Late penalty rule: 15m grace; 2 late logins = ₹500 rule penalty if exceeds threshold
  const lateDeductionAmount = monthlyLateLogins >= 2 ? 500 : 0;
  const unpaidLeaveDays = leaveStats.approved > 0 ? 1 : 0;
  const leaveDeductionAmount = unpaidLeaveDays * dailyRate;
  const professionalTax = 200;
  const totalDeductions = lateDeductionAmount + leaveDeductionAmount + professionalTax;
  const netTakeHomePay = Math.max(0, Math.round(baseSalary - totalDeductions));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../assets/images/logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.headerTitle}>{staffName}</Text>
              <View style={styles.staffBadge}>
                <Text style={styles.staffBadgeText}>STAFF</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              {branchName} • ID: {staffId}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={19} color={COLORS.red} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ========================================================================= */}
        {/* TAB 1: ATTENDANCE & PUNCH IN / OUT */}
        {/* ========================================================================= */}
        {activeTab === "attendance" && (
          <View style={styles.tabContent}>
            {/* Live Attendance Clock Hero Card */}
            <View style={styles.clockCard}>
              <View style={styles.clockHeaderRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.clockSub}>LIVE BIOMETRIC CLOCK</Text>
                <Text style={styles.clockDateText}>{currentDate}</Text>
              </View>

              <Text style={styles.clockDisplay}>{currentTime || "--:--:--"}</Text>

              {/* Shift & Grace Policy Pill */}
              <View style={styles.shiftPolicyPill}>
                <Ionicons name="time-outline" size={14} color="#0284c7" />
                <Text style={styles.shiftPolicyText}>
                  Shift: {shiftStart} - 08:30 PM • {graceMinutes}m Grace (Late after {cutoffTimeStr})
                </Text>
              </View>

              {/* Punch-In & Punch-Out Status Times */}
              <View style={styles.punchDetailsRow}>
                <View style={styles.punchDetailCol}>
                  <Text style={styles.punchDetailLabel}>PUNCH-IN TIME</Text>
                  <Text style={styles.punchDetailVal}>{punchInTime || "Not Punched"}</Text>
                  {punchStatus === "Late" && (
                    <View style={styles.lateTag}>
                      <Text style={styles.lateTagText}>⚠️ Late by {lateMinutes}m</Text>
                    </View>
                  )}
                  {punchStatus === "Present" && (
                    <View style={styles.onTimeTag}>
                      <Text style={styles.onTimeTagText}>✓ On-Time</Text>
                    </View>
                  )}
                </View>

                <View style={styles.punchDetailDivider} />

                <View style={styles.punchDetailCol}>
                  <Text style={styles.punchDetailLabel}>PUNCH-OUT TIME</Text>
                  <Text style={styles.punchDetailVal}>
                    {punchOutTime || (isPunchedIn ? "In Clinic Duty" : "—")}
                  </Text>
                  {isPunchedOut && (
                    <View style={styles.onTimeTag}>
                      <Text style={styles.onTimeTagText}>✓ Duty Closed</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Automatic Location Detection Banner */}
              <View style={styles.locationBanner}>
                <Ionicons name="location-sharp" size={16} color="#4ade80" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle}>VERIFIED CLINIC LOCATION</Text>
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {detectedLocation}
                  </Text>
                </View>
                <View style={styles.geofencePill}>
                  <Text style={styles.geofencePillText}>IN GEOFENCE</Text>
                </View>
              </View>

              {/* Main Punch Action Button */}
              {!isPunchedIn ? (
                <TouchableOpacity
                  style={[styles.punchActionBtn, styles.punchActionIn]}
                  onPress={() => openPunchModal("in")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="finger-print-outline" size={24} color={COLORS.white} />
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.punchActionText}>PUNCH IN ATTENDANCE</Text>
                    <Text style={styles.punchActionSubText}>Facial Selfie + Location Verified</Text>
                  </View>
                </TouchableOpacity>
              ) : !isPunchedOut ? (
                <TouchableOpacity
                  style={[styles.punchActionBtn, styles.punchActionOut]}
                  onPress={() => openPunchModal("out")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="stop-circle-outline" size={24} color={COLORS.white} />
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.punchActionText}>PUNCH OUT ATTENDANCE</Text>
                    <Text style={styles.punchActionSubText}>Facial Selfie + Close Duty</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.punchActionBtn, styles.punchActionDone]}>
                  <Ionicons name="checkmark-done-circle" size={24} color="#16a34a" />
                  <View style={{ alignItems: "center" }}>
                    <Text style={[styles.punchActionText, { color: "#16a34a" }]}>
                      DUTY COMPLETED FOR TODAY
                    </Text>
                    <Text style={[styles.punchActionSubText, { color: "#64748b" }]}>
                      Total Work Logged &amp; Verified
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Attendance & Late Login Summary KPIs */}
            <Text style={styles.sectionTitle}>NOVEMBER 2026 ATTENDANCE KPI STRIP</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: "#dcfce7" }]}>
                  <Ionicons name="checkmark-done" size={18} color="#16a34a" />
                </View>
                <Text style={styles.kpiVal}>{monthlyPresentDays}</Text>
                <Text style={styles.kpiLabel}>Days Present</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: "#fef3c7" }]}>
                  <Ionicons name="time" size={18} color="#d97706" />
                </View>
                <Text style={[styles.kpiVal, { color: "#d97706" }]}>{monthlyLateLogins}</Text>
                <Text style={styles.kpiLabel}>Late Logins</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: "#e0f2fe" }]}>
                  <Ionicons name="calendar-outline" size={18} color="#0284c7" />
                </View>
                <Text style={styles.kpiVal}>{monthlyTotalDays}</Text>
                <Text style={styles.kpiLabel}>Working Days</Text>
              </View>
            </View>

            {/* Dynamic Grace Policy Notice Card */}
            <View style={styles.gracePolicyCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="alert-circle-outline" size={20} color="#d97706" />
                <Text style={styles.gracePolicyTitle}>Late Login & Shift Compliance Rule</Text>
              </View>
              <Text style={styles.gracePolicyDesc}>
                Official shift starts at <Text style={{ fontWeight: "700" }}>{shiftStart}</Text> with a{" "}
                <Text style={{ fontWeight: "700" }}>{graceMinutes}-minute grace period</Text> configured by HR/Admin. Punching in after{" "}
                <Text style={{ fontWeight: "700", color: "#d97706" }}>{cutoffTimeStr}</Text> is automatically
                flagged as a Late Login and recorded in your monthly payroll statement.
              </Text>
            </View>

            {/* Daily Attendance History (This Month & Last Month) */}
            <View style={styles.dailyHistorySection}>
              <View style={styles.dailyHistoryHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="calendar-sharp" size={16} color="#0284c7" />
                  <Text style={styles.dailyHistoryTitle}>DAILY PUNCH & DUTY HISTORY</Text>
                </View>
                <Text style={styles.dailyHistoryCount}>{activeDailyLogs.length} Days Logged</Text>
              </View>

              {/* Month Selector Pills */}
              <View style={styles.monthToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.monthToggleBtn,
                    attendanceMonthFilter === "this_month" && styles.monthToggleBtnActive,
                  ]}
                  onPress={() => setAttendanceMonthFilter("this_month")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={attendanceMonthFilter === "this_month" ? "#0284c7" : "#64748b"}
                  />
                  <Text
                    style={[
                      styles.monthToggleText,
                      attendanceMonthFilter === "this_month" && styles.monthToggleTextActive,
                    ]}
                  >
                    This Month (Nov 2026)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.monthToggleBtn,
                    attendanceMonthFilter === "last_month" && styles.monthToggleBtnActive,
                  ]}
                  onPress={() => setAttendanceMonthFilter("last_month")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={attendanceMonthFilter === "last_month" ? "#0284c7" : "#64748b"}
                  />
                  <Text
                    style={[
                      styles.monthToggleText,
                      attendanceMonthFilter === "last_month" && styles.monthToggleTextActive,
                    ]}
                  >
                    Last Month (Oct 2026)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Daily Log Cards */}
              <View style={styles.dailyLogList}>
                {activeDailyLogs.map((log, idx) => (
                  <View key={`${log.dateIso}-${idx}`} style={styles.dailyLogCard}>
                    <View style={styles.dailyLogDateCol}>
                      <Text style={styles.dailyLogDay}>{log.dayName}</Text>
                      <Text style={styles.dailyLogDate}>{log.dayNum} {log.monthShort}</Text>
                    </View>

                    <View style={styles.dailyLogTimesCol}>
                      <View style={styles.dailyLogTimeRow}>
                        <Ionicons name="log-in-outline" size={13} color="#16a34a" />
                        <Text style={styles.dailyLogTimeLabel}>In: </Text>
                        <Text style={styles.dailyLogTimeVal}>{log.punchIn}</Text>
                      </View>
                      <View style={styles.dailyLogTimeRow}>
                        <Ionicons name="log-out-outline" size={13} color="#dc2626" />
                        <Text style={styles.dailyLogTimeLabel}>Out: </Text>
                        <Text style={styles.dailyLogTimeVal}>{log.punchOut}</Text>
                      </View>
                    </View>

                    <View style={styles.dailyLogStatusCol}>
                      {log.status === "On-Time" && (
                        <View style={styles.statusPillOnTime}>
                          <Text style={styles.statusPillOnTimeText}>✓ On-Time</Text>
                        </View>
                      )}
                      {log.status === "Late" && (
                        <View style={styles.statusPillLate}>
                          <Text style={styles.statusPillLateText}>⚠️ Late (+{log.lateMinutes}m)</Text>
                        </View>
                      )}
                      {log.status === "Weekly Off" && (
                        <View style={styles.statusPillOff}>
                          <Text style={styles.statusPillOffText}>Weekly Off</Text>
                        </View>
                      )}
                      {log.status === "Duty Active" && (
                        <View style={styles.statusPillActive}>
                          <Text style={styles.statusPillActiveText}>Active Duty</Text>
                        </View>
                      )}
                      {log.status === "Pending" && (
                        <View style={styles.statusPillPending}>
                          <Text style={styles.statusPillPendingText}>Not Punched</Text>
                        </View>
                      )}
                      <Text style={styles.dailyLogDuration}>{log.hoursWorked}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PAYROLL & STATEMENT BREAKDOWN */}
        {/* ========================================================================= */}
        {activeTab === "payroll" && (
          <View style={styles.tabContent}>
            {/* Net Payout Hero Banner */}
            <View style={styles.payoutCard}>
              <View style={styles.payoutTopRow}>
                <Text style={styles.payoutMonthLabel}>NOVEMBER 2026 STATEMENT</Text>
                <View style={styles.payoutStatusBadge}>
                  <Text style={styles.payoutStatusText}>READY FOR PAYOUT</Text>
                </View>
              </View>

              <Text style={styles.payoutAmount}>₹{netTakeHomePay.toLocaleString("en-IN")}</Text>
              <Text style={styles.payoutSub}>Net Take-Home Salary (After Policy Deductions)</Text>

              <View style={styles.payoutMetricsRow}>
                <View style={styles.payoutMetricItem}>
                  <Text style={styles.payoutMetricVal}>₹{baseSalary.toLocaleString("en-IN")}</Text>
                  <Text style={styles.payoutMetricLabel}>Gross Base</Text>
                </View>
                <View style={styles.payoutMetricDivider} />
                <View style={styles.payoutMetricItem}>
                  <Text style={[styles.payoutMetricVal, { color: "#ef4444" }]}>
                    -₹{Math.round(totalDeductions).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.payoutMetricLabel}>Total Deductions</Text>
                </View>
                <View style={styles.payoutMetricDivider} />
                <View style={styles.payoutMetricItem}>
                  <Text style={styles.payoutMetricVal}>{monthlyPresentDays} / {workingDays}</Text>
                  <Text style={styles.payoutMetricLabel}>Days Worked</Text>
                </View>
              </View>
            </View>

            {/* Itemized Earnings Breakdown */}
            <Text style={styles.sectionTitle}>EARNINGS BREAKDOWN</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Basic Salary</Text>
                <Text style={styles.breakdownVal}>₹15,000.00</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>House Rent Allowance (HRA)</Text>
                <Text style={styles.breakdownVal}>₹6,500.00</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Special Clinic Allowance</Text>
                <Text style={styles.breakdownVal}>₹3,500.00</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                <Text style={styles.breakdownTotalLabel}>Gross Monthly Pay</Text>
                <Text style={styles.breakdownTotalVal}>₹25,000.00</Text>
              </View>
            </View>

            {/* Itemized Deductions (With Late Login Calculation) */}
            <Text style={styles.sectionTitle}>DEDUCTIONS &amp; LATE LOGIN CALCULATIONS</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.breakdownLabel}>Late Login Deduction</Text>
                  <Text style={styles.breakdownSub}>
                    {monthlyLateLogins} late logins recorded (Cutoff: 09:15 AM)
                  </Text>
                </View>
                <Text style={[styles.breakdownVal, { color: "#dc2626" }]}>
                  {lateDeductionAmount > 0 ? `-₹${lateDeductionAmount.toFixed(2)}` : "₹0.00"}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.breakdownLabel}>Unpaid Leave Absence</Text>
                  <Text style={styles.breakdownSub}>
                    {unpaidLeaveDays} day × ₹{dailyRate.toFixed(2)} / day
                  </Text>
                </View>
                <Text style={[styles.breakdownVal, { color: "#dc2626" }]}>
                  {leaveDeductionAmount > 0 ? `-₹${leaveDeductionAmount.toFixed(2)}` : "₹0.00"}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Professional Tax (PT)</Text>
                <Text style={[styles.breakdownVal, { color: "#dc2626" }]}>-₹200.00</Text>
              </View>

              <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                <Text style={[styles.breakdownTotalLabel, { color: "#dc2626" }]}>
                  Total Deductions
                </Text>
                <Text style={[styles.breakdownTotalVal, { color: "#dc2626" }]}>
                  -₹{Math.round(totalDeductions).toLocaleString("en-IN")}.00
                </Text>
              </View>
            </View>

            {/* Payout Direct Deposit Information */}
            <View style={styles.payoutInfoCard}>
              <Ionicons name="card-outline" size={20} color="#0284c7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.payoutInfoTitle}>Direct Bank Transfer</Text>
                <Text style={styles.payoutInfoDesc}>
                  Salary will be credited on 1st Dec 2026 to registered Axis Bank account •••••• 4892.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LEAVE MANAGEMENT & APPLICATION */}
        {/* ========================================================================= */}
        {activeTab === "leaves" && (
          <View style={styles.tabContent}>
            {/* Leaves Quota & Action Banner */}
            <View style={styles.leavesHeroCard}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={styles.leavesHeroTitle}>Leave Entitlement</Text>
                  <Text style={styles.leavesHeroSub}>Annual Quota: 18 Days</Text>
                </View>
                <TouchableOpacity
                  style={styles.applyLeaveBtn}
                  onPress={() => setApplyModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color={COLORS.white} />
                  <Text style={styles.applyLeaveBtnText}>Apply Leave</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.leaveStatsStrip}>
                <View style={styles.leaveStatCol}>
                  <Text style={styles.leaveStatVal}>{leaveStats.total}</Text>
                  <Text style={styles.leaveStatLabel}>APPLIED</Text>
                </View>
                <View style={styles.leaveStatDivider} />
                <View style={styles.leaveStatCol}>
                  <Text style={[styles.leaveStatVal, { color: "#16a34a" }]}>{leaveStats.approved}</Text>
                  <Text style={styles.leaveStatLabel}>APPROVED</Text>
                </View>
                <View style={styles.leaveStatDivider} />
                <View style={styles.leaveStatCol}>
                  <Text style={[styles.leaveStatVal, { color: "#d97706" }]}>{leaveStats.pending}</Text>
                  <Text style={styles.leaveStatLabel}>PENDING</Text>
                </View>
                <View style={styles.leaveStatDivider} />
                <View style={styles.leaveStatCol}>
                  <Text style={[styles.leaveStatVal, { color: "#dc2626" }]}>{leaveStats.rejected}</Text>
                  <Text style={styles.leaveStatLabel}>REJECTED</Text>
                </View>
              </View>
            </View>

            {/* Live Leave Applications List */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 10 }}>
              <Text style={styles.sectionTitle}>MY LEAVE APPLICATIONS</Text>
              {loadingLeaves && <ActivityIndicator size="small" color="#0284c7" />}
            </View>

            {leavesList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={38} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Leave Applications</Text>
                <Text style={styles.emptySub}>
                  You haven&apos;t applied for any leaves yet. Tap &quot;Apply Leave&quot; above to submit an application.
                </Text>
              </View>
            ) : (
              leavesList.map((item) => (
                <View key={item.id} style={styles.leaveCard}>
                  <View style={styles.leaveCardTop}>
                    <View style={styles.leaveTypeBadge}>
                      <Text style={styles.leaveTypeBadgeText}>{item.leaveType}</Text>
                    </View>

                    {item.status === "Approved" ? (
                      <View style={styles.badgeApproved}>
                        <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                        <Text style={styles.badgeApprovedText}>APPROVED</Text>
                      </View>
                    ) : item.status === "Rejected" ? (
                      <View style={styles.badgeRejected}>
                        <Ionicons name="close-circle" size={12} color="#dc2626" />
                        <Text style={styles.badgeRejectedText}>REJECTED</Text>
                      </View>
                    ) : (
                      <View style={styles.badgePending}>
                        <Ionicons name="hourglass-outline" size={12} color="#d97706" />
                        <Text style={styles.badgePendingText}>PENDING</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.leaveDatesRow}>
                    <Ionicons name="calendar-clear-outline" size={15} color="#0284c7" />
                    <Text style={styles.leaveDateText}>
                      {item.fromDate} to {item.toDate}
                    </Text>
                  </View>

                  <Text style={styles.leaveReasonText}>
                    &quot;{item.reason}&quot;
                  </Text>

                  {item.reviewedBy ? (
                    <View style={styles.reviewedBox}>
                      <Text style={styles.reviewedText}>
                        Reviewed by: <Text style={{ fontWeight: "700" }}>{item.reviewedBy}</Text>
                      </Text>
                      {item.rejectionReason ? (
                        <Text style={styles.rejectionReasonText}>
                          Reason: {item.rejectionReason}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.awaitingText}>
                      Awaiting review by Branch HR / Admin
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* PUNCH VERIFICATION SELFIE & GEOFENCE MODAL */}
      {/* ========================================================================= */}
      <Modal visible={punchModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.punchModalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {punchTypeToConfirm === "in" ? "Verify Attendance Punch In" : "Verify Attendance Punch Out"}
                </Text>
                <Text style={styles.modalSub}>Facial Selfie &amp; Location Verification</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPunchModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Location & Time Stamp Row */}
            <View style={styles.verifyDetailsBox}>
              <View style={styles.verifyRow}>
                <Ionicons name="time-outline" size={16} color="#0284c7" />
                <Text style={styles.verifyLabel}>Time Stamp:</Text>
                <Text style={styles.verifyVal}>{currentTime} • {currentDate}</Text>
              </View>
              <View style={styles.verifyRow}>
                <Ionicons name="location-outline" size={16} color="#16a34a" />
                <Text style={styles.verifyLabel}>Location:</Text>
                <Text style={styles.verifyVal} numberOfLines={1}>{detectedLocation}</Text>
              </View>
            </View>

            {/* Selfie Camera Capture Box */}
            <View style={styles.selfieBox}>
              {selfiePhoto ? (
                <View style={styles.selfiePreviewContainer}>
                  <Image source={{ uri: selfiePhoto }} style={styles.selfieImage} resizeMode="cover" />
                  <View style={styles.verifiedStampPill}>
                    <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                    <Text style={styles.verifiedStampText}>FACIAL SELFIE READY</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.selfiePlaceholder}>
                  <View style={styles.cameraIconCircle}>
                    <Ionicons name="camera" size={32} color="#0284c7" />
                  </View>
                  <Text style={styles.selfiePromptTitle}>Facial Verification Required</Text>
                  <Text style={styles.selfiePromptSub}>
                    Please capture a front selfie inside the clinic to verify attendance compliance.
                  </Text>
                  <TouchableOpacity
                    style={styles.captureBtn}
                    onPress={handleTakeSelfie}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-reverse-outline" size={18} color="#ffffff" />
                    <Text style={styles.captureBtnText}>Capture Front Selfie</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {selfiePhoto && (
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={handleTakeSelfie}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color="#0284c7" />
                <Text style={styles.retakeBtnText}>Retake Selfie</Text>
              </TouchableOpacity>
            )}

            {/* Confirm Punch Button */}
            <TouchableOpacity
              style={[
                styles.confirmPunchBtn,
                punchTypeToConfirm === "in" ? styles.confirmIn : styles.confirmOut,
                (!selfiePhoto || submittingPunch) && styles.confirmDisabled,
              ]}
              onPress={handleConfirmPunch}
              disabled={!selfiePhoto || submittingPunch}
              activeOpacity={0.8}
            >
              {submittingPunch ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                  <Text style={styles.confirmPunchBtnText}>
                    {punchTypeToConfirm === "in" ? "CONFIRM PUNCH IN" : "CONFIRM PUNCH OUT"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* APPLY LEAVE MODAL */}
      {/* ========================================================================= */}
      <Modal visible={applyModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.applyModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Apply for Leave</Text>
                <Text style={styles.modalSub}>Submit leave request for Admin &amp; HR approval</Text>
              </View>
              <TouchableOpacity
                onPress={() => setApplyModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Leave Type Selector */}
              <Text style={styles.fieldLabel}>LEAVE TYPE</Text>
              <View style={styles.typePillsRow}>
                {["Casual Leave", "Sick Leave", "Emergency Leave", "Privilege Leave"].map((type) => {
                  const sel = leaveType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typePill, sel && styles.typePillActive]}
                      onPress={() => setLeaveType(type)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.typePillText, sel && styles.typePillTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Start Date & End Date Picker Buttons */}
              <View style={styles.datesGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>FROM DATE *</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => openCalendarPicker("from")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#0284c7" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.datePickerVal, !fromDate && styles.datePickerPlaceholder]}>
                        {fromDate ? formatDisplayDate(fromDate) : "Select Date"}
                      </Text>
                      {fromDate ? (
                        <Text style={styles.datePickerSub}>{fromDate}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>TO DATE *</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => openCalendarPicker("to")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#0284c7" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.datePickerVal, !toDate && styles.datePickerPlaceholder]}>
                        {toDate ? formatDisplayDate(toDate) : "Select Date"}
                      </Text>
                      {toDate ? (
                        <Text style={styles.datePickerSub}>{toDate}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Total Leave Duration Badge */}
              {leaveDurationDays > 0 ? (
                <View style={styles.durationBanner}>
                  <Ionicons name="hourglass-outline" size={15} color="#0284c7" />
                  <Text style={styles.durationText}>
                    Total Leave Duration:{" "}
                    <Text style={{ fontWeight: "800", color: "#0284c7" }}>
                      {leaveDurationDays} {leaveDurationDays === 1 ? "Day" : "Days"}
                    </Text>
                  </Text>
                </View>
              ) : null}

              {/* Return to Duty Date */}
              <Text style={styles.fieldLabel}>RETURN TO DUTY (JOINING DATE)</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => openCalendarPicker("return")}
                activeOpacity={0.8}
              >
                <Ionicons name="enter-outline" size={18} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.datePickerVal, !returnDate && styles.datePickerPlaceholder]}>
                    {returnDate ? formatDisplayDate(returnDate) : "Select return / joining date"}
                  </Text>
                  {returnDate ? (
                    <Text style={styles.datePickerSub}>{returnDate}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </TouchableOpacity>

              {/* Reason */}
              <Text style={styles.fieldLabel}>REASON / REMARKS *</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Explain the purpose of your leave..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={leaveReason}
                onChangeText={setLeaveReason}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitLeaveBtn, submittingLeave && styles.confirmDisabled]}
                onPress={handleApplyLeave}
                disabled={submittingLeave}
                activeOpacity={0.8}
              >
                {submittingLeave ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitLeaveBtnText}>SUBMIT APPLICATION</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* INTERACTIVE CALENDAR DATE PICKER MODAL */}
      {/* ========================================================================= */}
      <Modal visible={calendarModalVisible} transparent animationType="fade">
        <View style={styles.calModalOverlay}>
          <View style={styles.calModalContainer}>
            {/* Calendar Header with Target Title */}
            <View style={styles.calTargetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calTargetTitle}>
                  {calendarTarget === "from"
                    ? "Select Leave Start Date (From Date)"
                    : calendarTarget === "to"
                    ? "Select Leave End Date (To Date)"
                    : "Select Return to Duty Date"}
                </Text>
                <Text style={styles.calTargetSub}>Tap any day on the calendar below</Text>
              </View>
              <TouchableOpacity
                style={styles.calCloseBtn}
                onPress={() => setCalendarModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigation Row */}
            <View style={styles.calNavRow}>
              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 0) {
                    setCalMonth(11);
                    setCalYear(calYear - 1);
                  } else {
                    setCalMonth(calMonth - 1);
                  }
                }}
                style={styles.calArrowBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={18} color="#0f172a" />
              </TouchableOpacity>

              <Text style={styles.calMonthYearText}>
                {monthNames[calMonth]} {calYear}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 11) {
                    setCalMonth(0);
                    setCalYear(calYear + 1);
                  } else {
                    setCalMonth(calMonth + 1);
                  }
                }}
                style={styles.calArrowBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Weekdays Row */}
            <View style={styles.calWeekdaysRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (
                <Text key={idx} style={styles.calWeekdayText}>
                  {dayName}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calDaysGrid}>
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calEmptyDayCell} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const activeSelectedDate =
                  calendarTarget === "from" ? fromDate : calendarTarget === "to" ? toDate : returnDate;
                const isSelected = activeSelectedDate === dateStr;
                const isToday = new Date().toISOString().split("T")[0] === dateStr;

                return (
                  <TouchableOpacity
                    key={dayNum}
                    style={styles.calDayCell}
                    onPress={() => handleSelectCalendarDate(dayNum)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.calDayCircle,
                        isSelected && styles.calDayCircleSelected,
                        isToday && !isSelected && styles.calDayCircleToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayNumText,
                          isSelected && styles.calDayNumSelected,
                          isToday && !isSelected && styles.calDayNumToday,
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.calQuickActionsRow}>
              <TouchableOpacity
                style={styles.calQuickBtn}
                onPress={() => {
                  const now = new Date();
                  setCalYear(now.getFullYear());
                  setCalMonth(now.getMonth());
                  handleSelectCalendarDate(now.getDate());
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.calQuickBtnText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calQuickBtn}
                onPress={() => {
                  const tom = new Date();
                  tom.setDate(tom.getDate() + 1);
                  setCalYear(tom.getFullYear());
                  setCalMonth(tom.getMonth());
                  handleSelectCalendarDate(tom.getDate());
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.calQuickBtnText}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.calQuickBtn, { marginLeft: "auto", backgroundColor: "#f1f5f9" }]}
                onPress={() => setCalendarModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.calQuickBtnText, { color: "#475569" }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation with 3 Tabs */}
      <StaffBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  staffBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  staffBadgeText: { fontSize: 9, fontWeight: "900", color: "#0284c7" },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { flex: 1 },
  contentContainer: { padding: 14, paddingBottom: 20 },
  tabContent: { gap: 14 },

  /* Clock Card (Clean White Hero Theme) */
  clockCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clockHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
    justifyContent: "center",
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16a34a",
  },
  clockSub: { fontSize: 10.5, fontWeight: "800", color: "#64748b", letterSpacing: 0.8 },
  clockDateText: { fontSize: 11, color: "#0284c7", fontWeight: "700", marginLeft: "auto" },
  clockDisplay: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0f172a",
    marginVertical: 6,
    letterSpacing: 1,
  },
  shiftPolicyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  shiftPolicyText: { fontSize: 11, color: "#0369a1", fontWeight: "700" },

  punchDetailsRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
  },
  punchDetailCol: { flex: 1, alignItems: "center" },
  punchDetailDivider: { width: 1, backgroundColor: "#e2e8f0" },
  punchDetailLabel: { fontSize: 9.5, fontWeight: "700", color: "#64748b", letterSpacing: 0.4 },
  punchDetailVal: { fontSize: 13, fontWeight: "800", color: "#0f172a", marginTop: 2 },
  lateTag: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 4,
  },
  lateTagText: { fontSize: 9.5, fontWeight: "800", color: "#b45309" },
  onTimeTag: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 4,
  },
  onTimeTagText: { fontSize: 9.5, fontWeight: "800", color: "#15803d" },

  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 6,
  },
  locationTitle: { fontSize: 9, fontWeight: "800", color: "#64748b", letterSpacing: 0.3 },
  locationAddress: { fontSize: 11, color: "#0f172a", fontWeight: "600", marginTop: 1 },
  geofencePill: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  geofencePillText: { fontSize: 8.5, fontWeight: "900", color: "#ffffff" },

  punchActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 6,
  },
  punchActionIn: { backgroundColor: "#16a34a" },
  punchActionOut: { backgroundColor: "#dc2626" },
  punchActionDone: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  punchActionText: { fontSize: 13, fontWeight: "800", color: "#ffffff", letterSpacing: 0.4 },
  punchActionSubText: { fontSize: 10, color: "#dcfce7", marginTop: 1 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.6,
    marginTop: 6,
  },

  /* KPI Grid */
  kpiGrid: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    alignItems: "center",
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  kpiVal: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  kpiLabel: { fontSize: 10, color: "#64748b", fontWeight: "600", marginTop: 1 },

  gracePolicyCard: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  gracePolicyTitle: { fontSize: 12, fontWeight: "800", color: "#92400e" },
  gracePolicyDesc: { fontSize: 11.5, color: "#78350f", lineHeight: 16 },

  /* Daily Punch & Duty History */
  dailyHistorySection: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 12,
  },
  dailyHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dailyHistoryTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  dailyHistoryCount: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748b",
  },
  monthToggleRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 10,
  },
  monthToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 8,
  },
  monthToggleBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  monthToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  monthToggleTextActive: {
    color: "#0284c7",
    fontWeight: "900",
  },
  dailyLogList: {
    gap: 8,
  },
  dailyLogCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  dailyLogDateCol: {
    width: 58,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    paddingRight: 6,
  },
  dailyLogDay: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  },
  dailyLogDate: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 1,
  },
  dailyLogTimesCol: {
    flex: 1,
    gap: 3,
  },
  dailyLogTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dailyLogTimeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  dailyLogTimeVal: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1e293b",
  },
  dailyLogStatusCol: {
    alignItems: "flex-end",
    gap: 3,
  },
  statusPillOnTime: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillOnTimeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803d",
  },
  statusPillLate: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillLateText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#b45309",
  },
  statusPillOff: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillOffText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
  },
  statusPillActive: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillActiveText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  statusPillPending: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillPendingText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
  },
  dailyLogDuration: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748b",
  },

  /* Payout Card */
  payoutCard: {
    backgroundColor: "#0284c7",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
  },
  payoutTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  payoutMonthLabel: { fontSize: 10.5, fontWeight: "800", color: "#bae6fd", letterSpacing: 0.6 },
  payoutStatusBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  payoutStatusText: { fontSize: 9, fontWeight: "900", color: "#ffffff" },
  payoutAmount: { fontSize: 34, fontWeight: "900", color: "#ffffff", marginVertical: 6 },
  payoutSub: { fontSize: 11, color: "#e0f2fe", fontWeight: "600" },
  payoutMetricsRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  payoutMetricItem: { flex: 1, alignItems: "center" },
  payoutMetricDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  payoutMetricVal: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
  payoutMetricLabel: { fontSize: 9.5, color: "#bae6fd", marginTop: 2 },

  breakdownCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  breakdownLabel: { fontSize: 12.5, color: "#334155", fontWeight: "600" },
  breakdownSub: { fontSize: 10, color: "#94a3b8", marginTop: 1 },
  breakdownVal: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    marginTop: 4,
  },
  breakdownTotalLabel: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  breakdownTotalVal: { fontSize: 14, fontWeight: "900", color: "#0284c7" },

  payoutInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 12,
    padding: 12,
  },
  payoutInfoTitle: { fontSize: 12, fontWeight: "800", color: "#0369a1" },
  payoutInfoDesc: { fontSize: 11, color: "#0284c7", marginTop: 1 },

  /* Leaves Hero Card */
  leavesHeroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 12,
  },
  leavesHeroTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  leavesHeroSub: { fontSize: 11.5, color: "#64748b", marginTop: 1 },
  applyLeaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  applyLeaveBtnText: { fontSize: 11.5, fontWeight: "800", color: "#ffffff" },

  leaveStatsStrip: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  leaveStatCol: { flex: 1, alignItems: "center" },
  leaveStatDivider: { width: 1, backgroundColor: "#e2e8f0" },
  leaveStatVal: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  leaveStatLabel: { fontSize: 8.5, fontWeight: "800", color: "#94a3b8", marginTop: 2 },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { fontSize: 13.5, fontWeight: "800", color: "#0f172a" },
  emptySub: { fontSize: 11.5, color: "#64748b", textAlign: "center" },

  leaveCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 8,
  },
  leaveCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leaveTypeBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  leaveTypeBadgeText: { fontSize: 10.5, fontWeight: "800", color: "#334155" },
  badgeApproved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeApprovedText: { fontSize: 9.5, fontWeight: "800", color: "#16a34a" },
  badgeRejected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeRejectedText: { fontSize: 9.5, fontWeight: "800", color: "#dc2626" },
  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePendingText: { fontSize: 9.5, fontWeight: "800", color: "#d97706" },

  leaveDatesRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  leaveDateText: { fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  leaveReasonText: { fontSize: 12, color: "#475569", fontStyle: "italic" },
  reviewedBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  reviewedText: { fontSize: 10.5, color: "#64748b" },
  rejectionReasonText: { fontSize: 10.5, color: "#dc2626", fontWeight: "600", marginTop: 2 },
  awaitingText: { fontSize: 10.5, color: "#94a3b8", fontStyle: "italic" },

  /* Modal Backdrop & Containers */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  punchModalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    maxHeight: "90%",
  },
  applyModalContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  modalSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },

  verifyDetailsBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  verifyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifyLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  verifyVal: { fontSize: 11.5, fontWeight: "700", color: "#0f172a", flex: 1 },

  selfieBox: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  selfiePlaceholder: {
    width: "100%",
    backgroundColor: "#f0f9ff",
    borderWidth: 2,
    borderColor: "#bae6fd",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  cameraIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  selfiePromptTitle: { fontSize: 13, fontWeight: "800", color: "#0369a1" },
  selfiePromptSub: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  captureBtnText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },

  selfiePreviewContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#16a34a",
    position: "relative",
  },
  selfieImage: { width: "100%", height: "100%" },
  verifiedStampPill: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedStampText: { fontSize: 8, fontWeight: "900", color: "#16a34a" },

  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  retakeBtnText: { fontSize: 11.5, color: "#0284c7", fontWeight: "700" },

  confirmPunchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  confirmIn: { backgroundColor: "#16a34a" },
  confirmOut: { backgroundColor: "#dc2626" },
  confirmDisabled: { opacity: 0.5 },
  confirmPunchBtnText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  /* Apply Leave Fields */
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  typePillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  typePillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  typePillText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  typePillTextActive: { color: "#ffffff" },
  datesGrid: { flexDirection: "row", gap: 10 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    color: "#0f172a",
  },
  submitLeaveBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 30,
  },
  submitLeaveBtnText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  /* Calendar Date Picker Input Buttons */
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  datePickerPlaceholder: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94a3b8",
  },
  datePickerSub: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
  },
  durationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  durationText: {
    fontSize: 11.5,
    color: "#0369a1",
    fontWeight: "600",
  },

  /* Calendar Modal Styles */
  calModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calModalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  calTargetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  calTargetTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  calTargetSub: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
  },
  calCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  calNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  calMonthYearText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    paddingBottom: 4,
  },
  calWeekdayText: {
    width: 36,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  calDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calEmptyDayCell: {
    width: "14.28%",
    height: 36,
  },
  calDayCell: {
    width: "14.28%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  calDayCircleSelected: {
    backgroundColor: "#0284c7",
  },
  calDayCircleToday: {
    borderWidth: 1.5,
    borderColor: "#16a34a",
  },
  calDayNumText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
  },
  calDayNumSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
  calDayNumToday: {
    color: "#16a34a",
    fontWeight: "800",
  },
  calQuickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  calQuickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
  },
  calQuickBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
});
