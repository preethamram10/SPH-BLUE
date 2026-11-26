import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  AppState,
  AppStateStatus,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveBranch, getAssignedBranch, saveActiveBranch, apiFetch, clearAllAuthData } from "../../services/auth";
import { getBranchPhone } from "../../utils/branchPhone";
import { API_BASE_URL } from "../../config/api";
import { useNetwork } from "../../context/NetworkContext";
import { AppointmentPaymentModal } from "../../components/payment/AppointmentPaymentModal";
import { AppointmentCard } from "../../components/reception/AppointmentCard";
import {
  useAppointmentsSummary,
  useAppointmentsList,
  checkAppointmentsChanges,
  prefetchDateAppointments,
} from "../../hooks/useReceptionAppointments";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

// Brand Colors
const COLORS = {
  blue: "#268ec8",
  themeBlue: "#0284c7",
  green: "#16a34a",
  brandGreen: "#a8ce3a",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
  lightBlueBg: "#f0f9ff",
  pillBorder: "#bae6fd",
  amber: "#d97706",
  errorRed: "#ef4444",
};

export default function ReceptionDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOnline, checkConnection } = useNetwork();
  const [activeBranch, setActiveBranch] = useState<any>({ name: "Kphb Branch" });

  // Date Helpers (DD-MM-YYYY)
  const getYesterdayStr = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const d = String(yesterday.getDate()).padStart(2, "0");
    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
    const y = yesterday.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const getTodayStr = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = String(tomorrow.getDate()).padStart(2, "0");
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const y = tomorrow.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const yesterdayStr = useMemo(() => getYesterdayStr(), []);
  const todayStr = useMemo(() => getTodayStr(), []);
  const tomorrowStr = useMemo(() => getTomorrowStr(), []);

  // Selected Date Filter for Appointments (Default: Today)
  const [selectedDate, setSelectedDate] = useState(() => getTodayStr());
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Active Status Filter Tab (Default to Waiting / UPCOMING per user specification)
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "ACTIVE" | "COLLECT_FEE" | "COMPLETED">("UPCOMING");

  // Completed Appointments pagination limit (initial 20 + Load More)
  const [completedLimit, setCompletedLimit] = useState(20);

  // Calendar Modal State
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // 24-Hour Deleted Appointments State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [deletedAppointments, setDeletedAppointments] = useState<any[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTargetAppt, setRescheduleTargetAppt] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => getTodayStr());
  const [rescheduleSlot, setRescheduleSlot] = useState("10:00 AM");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleShowCalendar, setRescheduleShowCalendar] = useState(false);
  const [rescheduleCalYear, setRescheduleCalYear] = useState(() => new Date().getFullYear());
  const [rescheduleCalMonth, setRescheduleCalMonth] = useState(() => new Date().getMonth());
  const [rescheduleDoctors, setRescheduleDoctors] = useState<any[]>([]);
  const [selectedRescheduleDoctor, setSelectedRescheduleDoctor] = useState<any>(null);
  const [loadingRescheduleDoctors, setLoadingRescheduleDoctors] = useState(false);
  const [rescheduleNoShows, setRescheduleNoShows] = useState<any[]>([]);

  // Appointment Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentAppt, setSelectedPaymentAppt] = useState<any>(null);

  // Follow-up Opted / Not Opted Modal State
  const [followUpModalType, setFollowUpModalType] = useState<"OPTED" | "NOT_OPTED" | null>(null);
  const [followUpModalSearch, setFollowUpModalSearch] = useState("");

  // Track screen focus & AppState to halt background polling when navigated away or minimized
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [appState, setAppState] = useState<AppStateStatus>("active");
  const lastVerifiedAtRef = useRef<number>(Date.now());
  const lastSeenVersionRef = useRef<string>("");

  // Pause polling and network when app is backgrounded or minimized
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      setAppState(nextState);
    });
    return () => sub.remove();
  }, []);

  // Live Branch Target State (Fetched once on mount, NOT in periodic polling)
  const [branchTarget, setBranchTarget] = useState<{
    targetGoal: number;
    targetReached: number;
    percentage: number;
    remaining: number;
    status: string;
  } | null>(null);

  const fetchBranchTarget = async (bName: string) => {
    try {
      const cleanBranch = (bName || "KPHB")
        .toLowerCase()
        .replace(/spiritual|homeopathy|clinic|branch/gi, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
      const data = await apiFetch<any>("/admin/targets?role=ADMIN");
      if (data && data.success && Array.isArray(data.branches)) {
        const match = data.branches.find((b: any) => {
          const bNorm = (b.branch || "")
            .toLowerCase()
            .replace(/spiritual|homeopathy|clinic|branch/gi, "")
            .replace(/[^a-z0-9]/g, "")
            .trim();
          return bNorm === cleanBranch || bNorm.includes(cleanBranch) || cleanBranch.includes(bNorm);
        });
        if (match) {
          setBranchTarget(match);
        } else if (data.branches.length > 0) {
          setBranchTarget(data.branches[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load branch target on mobile reception:", err);
    }
  };

  // Check mandatory cleaning audit lockout
  const checkCleaningAuditLockout = async (branch: string) => {
    try {
      const data = await apiFetch<any>(`/cleaning/lockout?branchName=${encodeURIComponent(branch)}`);
      if (data?.success && data.lockout && data.task) {
        router.replace({
          pathname: "/(reception)/branch-cleaning",
          params: { isLockout: "true" },
        } as any);
      }
    } catch {}
  };

  // Initial branch load: Ensure valid branch is loaded and persisted immediately
  useEffect(() => {
    getActiveBranch().then(async (b) => {
      if (b && b.name) {
        setActiveBranch(b);
        checkCleaningAuditLockout(b.name);
        fetchBranchTarget(b.name);
      } else {
        const assigned = await getAssignedBranch();
        if (assigned && assigned.name) {
          await saveActiveBranch(assigned);
          setActiveBranch(assigned);
          checkCleaningAuditLockout(assigned.name);
          fetchBranchTarget(assigned.name);
        } else {
          try {
            const data = await apiFetch<any>("/branches");
            if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
              const defaultBranch = data.data[0];
              await saveActiveBranch(defaultBranch);
              setActiveBranch(defaultBranch);
              checkCleaningAuditLockout(defaultBranch.name);
              fetchBranchTarget(defaultBranch.name);
            } else {
              const fallback = { name: "Kphb Branch" };
              await saveActiveBranch(fallback);
              setActiveBranch(fallback);
            }
          } catch {
            const fallback = { name: "Kphb Branch" };
            await saveActiveBranch(fallback);
            setActiveBranch(fallback);
          }
        }
      }
    });
  }, []);

  // Pre-fetch Yesterday and Tomorrow in the background when activeBranch is available
  useEffect(() => {
    if (activeBranch?.name) {
      prefetchDateAppointments(queryClient, activeBranch.name, yesterdayStr);
      prefetchDateAppointments(queryClient, activeBranch.name, tomorrowStr);
    }
  }, [activeBranch?.name, queryClient, yesterdayStr, tomorrowStr]);

  // Clean branch name
  const cleanBranchName = useMemo(() => {
    return (activeBranch?.name || "").replace(/Spiritual Homeopathy/gi, "").trim();
  }, [activeBranch?.name]);

  // 1. Lightweight DB Summary Hook (< 5ms)
  const {
    data: summary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useAppointmentsSummary(activeBranch?.name, selectedDate);

  // 2. Full Appointments List Hook with per-[branch, date] caching
  // Kept in memory (staleTime 10 mins). NO blind full refetch on interval!
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments,
  } = useAppointmentsList(activeBranch?.name, selectedDate, {
    refetchInterval: false,
  });

  // Keep track of the version of appointments currently in memory
  useEffect(() => {
    if (appointments && appointments.length > 0 && !lastSeenVersionRef.current) {
      let maxUp = "";
      for (let i = 0; i < appointments.length; i++) {
        const up = appointments[i].updatedAt || appointments[i].createdAt || "";
        if (up > maxUp) maxUp = up;
      }
      lastSeenVersionRef.current = `${maxUp}:${appointments.length}`;
    }
  }, [appointments]);

  // 3. Lightweight Change-Check (every 25 seconds: ONLY for Today, focused, and active)
  useEffect(() => {
    const shouldCheck =
      isScreenFocused && appState === "active" && selectedDate === todayStr && !!cleanBranchName;
    if (!shouldCheck) return;

    const interval = setInterval(async () => {
      const changes = await checkAppointmentsChanges(cleanBranchName, selectedDate);
      if (changes && changes.version) {
        lastVerifiedAtRef.current = Date.now();
        if (lastSeenVersionRef.current && changes.version !== lastSeenVersionRef.current) {
          lastSeenVersionRef.current = changes.version;
          // Refetch quietly in the background without clearing screen or showing loading spinner
          refetchAppointments();
          refetchSummary();
        } else if (!lastSeenVersionRef.current) {
          lastSeenVersionRef.current = changes.version;
        }
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [isScreenFocused, appState, selectedDate, todayStr, cleanBranchName, refetchAppointments, refetchSummary]);

  // 4. On returning to Dashboard from other screens:
  // Immediately refetch appointments & summary so newly created/updated appointments show instantly
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      refetchAppointments();
      refetchSummary();
      return () => {
        setIsScreenFocused(false);
      };
    }, [refetchAppointments, refetchSummary])
  );

  // Categorized appointments from cached list
  const upcomingAppointments = useMemo(
    () => appointments.filter((a) => !a.status || a.status === "SCHEDULED" || a.status === "WAITING"),
    [appointments]
  );
  const inConsultationAppointments = useMemo(
    () => appointments.filter((a) => a.status === "IN_CONSULTATION"),
    [appointments]
  );
  const collectFeeAppointments = useMemo(
    () => appointments.filter((a) => {
      const st = (a.status || "").toUpperCase();
      return !a.isFeeCollected && st !== "COMPLETED" && (st === "COLLECT_FEE" || !!a.isSentToReception);
    }),
    [appointments]
  );
  const completedAppointments = useMemo(
    () => appointments.filter((a) => {
      const st = (a.status || "").toUpperCase();
      return st === "COMPLETED" || !!a.isFeeCollected;
    }),
    [appointments]
  );

  // Summary counts: Display "-" while loading (NEVER show fake 0)
  const totalCount = isLoadingSummary && !summary ? "–" : (summary?.total ?? appointments.length);
  const waitingCount = isLoadingSummary && !summary ? "–" : (summary?.waiting ?? upcomingAppointments.length);
  const inConsultationCount = isLoadingSummary && !summary ? "–" : (summary?.inConsultation ?? inConsultationAppointments.length);
  const collectFeeCount = isLoadingSummary && !summary ? "–" : (summary?.collectFee ?? collectFeeAppointments.length);
  const completedCount = isLoadingSummary && !summary ? "–" : (summary?.completed ?? completedAppointments.length);

  // Follow-up Opted vs Not Opted Calculation
  const isFollowUpOpted = (a: any) => {
    if (!a) return false;
    if (a.isFollowUpBooked || a.followUpOpted === true) return true;
    if (a.followUpDate && typeof a.followUpDate === "string" && a.followUpDate.trim().length > 0) {
      const interval = (a.followUpInterval || "").trim().toLowerCase();
      if (interval !== "no follow-up" && interval !== "none" && interval !== "no_followup") {
        return true;
      }
    }
    return false;
  };

  const optedFollowUpAppointments = useMemo(
    () => appointments.filter(isFollowUpOpted),
    [appointments]
  );
  const notOptedFollowUpAppointments = useMemo(
    () => appointments.filter((a) => !isFollowUpOpted(a)),
    [appointments]
  );

  const currentFollowUpList = useMemo(() => {
    return followUpModalType === "OPTED" ? optedFollowUpAppointments : notOptedFollowUpAppointments;
  }, [followUpModalType, optedFollowUpAppointments, notOptedFollowUpAppointments]);

  const optedFollowUpCount = isLoadingSummary && !summary ? "–" : (summary?.optedFollowUp ?? optedFollowUpAppointments.length);
  const notOptedFollowUpCount = isLoadingSummary && !summary ? "–" : (summary?.notOptedFollowUp ?? notOptedFollowUpAppointments.length);

  // Displayed Appointments for Single Virtualized FlatList
  const displayedAppointments = useMemo(() => {
    switch (activeFilter) {
      case "UPCOMING":
        return upcomingAppointments.map((a, i) => ({
          ...a,
          __variant: "UPCOMING" as const,
          __index: i,
        }));
      case "ACTIVE":
        return inConsultationAppointments.map((a, i) => ({
          ...a,
          __variant: "ACTIVE" as const,
          __index: i,
        }));
      case "COLLECT_FEE":
        return collectFeeAppointments.map((a, i) => ({
          ...a,
          __variant: "COLLECT_FEE" as const,
          __index: i,
        }));
      case "COMPLETED":
        return completedAppointments.slice(0, completedLimit).map((a, i) => ({
          ...a,
          __variant: "COMPLETED" as const,
          __index: i,
        }));
      case "ALL":
      default:
        return [
          ...upcomingAppointments.map((a, i) => ({ ...a, __variant: "UPCOMING" as const, __index: i })),
          ...inConsultationAppointments.map((a, i) => ({ ...a, __variant: "ACTIVE" as const, __index: i })),
          ...collectFeeAppointments.map((a, i) => ({ ...a, __variant: "COLLECT_FEE" as const, __index: i })),
          ...completedAppointments.slice(0, completedLimit).map((a, i) => ({ ...a, __variant: "COMPLETED" as const, __index: i })),
        ];
    }
  }, [activeFilter, upcomingAppointments, inConsultationAppointments, collectFeeAppointments, completedAppointments, completedLimit]);

  // Pull-to-refresh handler
  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      await Promise.all([
        refetchAppointments(),
        refetchSummary(),
        activeBranch?.name ? fetchBranchTarget(activeBranch.name) : Promise.resolve(),
      ]);
    } finally {
      setIsPullRefreshing(false);
    }
  };

  // Reorder queue: Move appointment UP in Upcoming Queue
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const currentList = [...upcomingAppointments];
    const temp = currentList[index];
    currentList[index] = currentList[index - 1];
    currentList[index - 1] = temp;

    const otherList = appointments.filter((a) => {
      const st = (a.status || "").toUpperCase();
      return st === "IN_CONSULTATION" || st === "COLLECT_FEE" || st === "COMPLETED" || !!a.isFeeCollected;
    });
    const nextList = [...currentList, ...otherList];

    // Optimistic cache update
    queryClient.setQueryData(["appointments-list", cleanBranchName, selectedDate], nextList);

    try {
      const orderedIds = nextList.map((a) => a.id);
      await apiFetch("/reception/appointments", {
        method: "PATCH",
        body: JSON.stringify({ action: "REORDER", orderedIds }),
      });
    } catch (err) {
      console.error("Failed to persist queue reorder:", err);
      refetchAppointments();
    }
  };

  // Reorder queue: Move appointment DOWN in Upcoming Queue
  const handleMoveDown = async (index: number) => {
    if (index >= upcomingAppointments.length - 1) return;
    const currentList = [...upcomingAppointments];
    const temp = currentList[index];
    currentList[index] = currentList[index + 1];
    currentList[index + 1] = temp;

    const otherList = appointments.filter((a) => {
      const st = (a.status || "").toUpperCase();
      return st === "IN_CONSULTATION" || st === "COLLECT_FEE" || st === "COMPLETED" || !!a.isFeeCollected;
    });
    const nextList = [...currentList, ...otherList];

    // Optimistic cache update
    queryClient.setQueryData(["appointments-list", cleanBranchName, selectedDate], nextList);

    try {
      const orderedIds = nextList.map((a) => a.id);
      await apiFetch("/reception/appointments", {
        method: "PATCH",
        body: JSON.stringify({ action: "REORDER", orderedIds }),
      });
    } catch (err) {
      console.error("Failed to persist queue reorder:", err);
      refetchAppointments();
    }
  };

  const openPatientFile = (appt: any) => {
    router.push({
      pathname: "/(reception)/patient-file",
      params: {
        id: appt.id,
        name: appt.patientName || appt.name,
        phone: appt.phoneNumber || appt.phone,
        registrationId: appt.registrationId || appt.patientId || "SPH-GEN",
        branch: activeBranch?.name || "KPHB",
      },
    } as any);
  };

  const openPatientHistory = (appt: any) => {
    const regId = appt.registrationId || appt.patientId || "SPH-GEN";
    const name = encodeURIComponent(appt.patientName || appt.name || "");
    const phone = encodeURIComponent((appt.phoneNumber || appt.phone || "").replace(/\D/g, "").slice(-10));
    const branch = encodeURIComponent(appt.branch || activeBranch?.name || "Clinic");
    router.push(`/(reception)/patient-history?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
  };

  // Start Consultation
  const handleStartConsultation = async (appt: any) => {
    lastVerifiedAtRef.current = Date.now();
    // 1. Optimistic cache update
    queryClient.setQueryData<any[]>(["appointments-list", cleanBranchName, selectedDate], (old = []) =>
      old.map((a) => (a.id === appt.id ? { ...a, status: "IN_CONSULTATION" } : a))
    );

    // 2. Persist to API
    apiFetch("/reception/appointments", {
      method: "PATCH",
      body: JSON.stringify({
        action: "UPDATE_STATUS",
        id: appt.id,
        status: "IN_CONSULTATION",
      }),
    })
      .then(() => {
        refetchSummary();
      })
      .catch((err) => {
        console.error("Failed to update status:", err);
        refetchAppointments();
      });

    // 3. Immediately open patient file
    openPatientFile({ ...appt, status: "IN_CONSULTATION" });
  };

  // Deleted Appointments Handling (24h trash)
  const fetchDeletedAppointments = async () => {
    setIsLoadingDeleted(true);
    try {
      const data = await apiFetch(`/reception/deleted-appointments?branch=${encodeURIComponent(cleanBranchName)}`);
      if (data.success && Array.isArray(data.appointments)) {
        setDeletedAppointments(data.appointments);
      } else {
        setDeletedAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch deleted appointments:", err);
      setDeletedAppointments([]);
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  const handleOpenRestoreModal = () => {
    setIsRestoreModalOpen(true);
    fetchDeletedAppointments();
  };

  const handleRestoreAppointment = async (id: string, token: string, patientName: string) => {
    try {
      const data = await apiFetch("/reception/deleted-appointments", {
        method: "POST",
        body: JSON.stringify({ action: "RESTORE", id }),
      });
      if (data.success) {
        Alert.alert("Restored", `Appointment ${token} for ${patientName} has been restored!`);
        lastVerifiedAtRef.current = Date.now();
        fetchDeletedAppointments();
        queryClient.invalidateQueries({ queryKey: ["appointments-list", cleanBranchName] });
        queryClient.invalidateQueries({ queryKey: ["appointments-summary", cleanBranchName] });
      } else {
        Alert.alert("Error", data.error || "Failed to restore appointment.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to restore appointment.");
    }
  };

  const handleDeleteAppointment = (appt: any) => {
    const id = appt.id;
    const token = appt.token;
    const patientName = appt.patientName;
    Alert.alert(
      "Cancel Appointment",
      `Cancel appointment ${token} for ${patientName}? You can restore it from the 'Restore (24h)' button within 24 hours.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              const data = await apiFetch("/reception/deleted-appointments", {
                method: "POST",
                body: JSON.stringify({
                  action: "DELETE",
                  id,
                  deletedBy: "Reception",
                  reason: "Cancelled by reception",
                }),
              });
              if (data.success) {
                Alert.alert("Appointment Cancelled", `Appointment ${token} moved to 24h trash.`);
                lastVerifiedAtRef.current = Date.now();
                queryClient.invalidateQueries({ queryKey: ["appointments-list", cleanBranchName] });
                queryClient.invalidateQueries({ queryKey: ["appointments-summary", cleanBranchName] });
              } else {
                Alert.alert("Error", data.error || "Failed to delete appointment.");
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete appointment.");
            }
          },
        },
      ]
    );
  };

  // Phone Call & WhatsApp Handlers
  const handleCallPatient = (phone: string | undefined) => {
    if (!phone) {
      Alert.alert("No Phone Number", "This appointment does not have a valid phone number.");
      return;
    }
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("Invalid Phone Number", "Cannot dial this phone number.");
      return;
    }
    Linking.openURL(`tel:${clean}`).catch((err) => {
      Alert.alert("Call Error", "Could not open phone dialer: " + err.message);
    });
  };

  const handleWhatsAppPatient = (phone: string | undefined, patientName?: string) => {
    if (!phone) {
      Alert.alert("No Phone Number", "This appointment does not have a valid phone number.");
      return;
    }
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (!clean) {
      Alert.alert("Invalid Phone Number", "Cannot send WhatsApp to this phone number.");
      return;
    }
    const msg = `Hello ${patientName || "Patient"}, your appointment is confirmed at Spiritual Homeopathy. Please reach 10 minutes prior.`;
    const waUrl = `whatsapp://send?phone=91${clean}&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(waUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(waUrl);
        } else {
          return Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl).catch((err) => {
          Alert.alert("WhatsApp Error", "Could not open WhatsApp: " + err.message);
        });
      });
  };

  const handleOpenInvoice = (appt: any) => {
    setSelectedPaymentAppt(appt);
    setPaymentModalVisible(true);
  };

  const handleShareInvoice = (appt: any) => {
    const rawPhone = appt.phoneNumber || appt.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone) {
      Alert.alert("No Phone Number", "This appointment does not have a valid mobile number to share the invoice.");
      return;
    }

    const invoiceNum = appt.invoiceId || "INV-RECEIPT";
    const totalPaidNum = Number(appt.totalPaid ?? appt.totalAmountDue ?? appt.consultationFee ?? 0).toFixed(2);
    const dateStr = appt.appointmentDate || selectedDate || new Date().toISOString().slice(0, 10);
    const timeStr = appt.timeSlot ? ` at ${appt.timeSlot}` : "";
    const targetBranch = appt.branch || activeBranch?.name || "KPHB Branch";

    const msg =
      `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `Receipt No: ${invoiceNum}\n` +
      `Patient Name: ${appt.patientName || "Patient"}\n` +
      `Phone: +91 ${cleanPhone}\n` +
      `Doctor: ${appt.doctorName || "Dr. Prashant K Vaidya"}\n` +
      `Branch: ${targetBranch}\n` +
      `Schedule: ${dateStr}${timeStr}\n` +
      `Specialty: Homeopathy\n` +
      `--------------------------------\n` +
      `*TOTAL AMOUNT PAID: ₹${totalPaidNum}*\n` +
      `Payment Status: PAID ✓\n` +
      `--------------------------------\n` +
      `Thank you for choosing Spiritual Homeopathy!`;

    const waUrl = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(waUrl)
      .then((supported) => {
        if (supported) return Linking.openURL(waUrl);
        return Linking.openURL(webUrl);
      })
      .catch(() => {
        Linking.openURL(webUrl).catch((err) => {
          Alert.alert("Share Error", "Could not open WhatsApp: " + err.message);
        });
      });
  };

  // Reschedule Handlers
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

  const fetchRescheduleDoctors = async (bName: string, dt: string, preferredDoctorName?: string) => {
    try {
      setLoadingRescheduleDoctors(true);
      const day = getDayOfWeekAbbr(dt);
      const cleanBranch = (bName || "KPHB").replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";

      const [timingsRes, noShowRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/doctor-timings?branch=${encodeURIComponent(cleanBranch)}&day=${day}`),
        fetch(`${API_BASE_URL}/reception/doctor-no-show?branch=${encodeURIComponent(cleanBranch)}&date=${encodeURIComponent(dt)}`),
      ]);

      let noShows: any[] = [];
      if (noShowRes.ok) {
        const noShowData = await noShowRes.json();
        if (noShowData.success && Array.isArray(noShowData.noShows)) {
          noShows = noShowData.noShows;
          setRescheduleNoShows(noShows);
        } else {
          setRescheduleNoShows([]);
        }
      }

      if (timingsRes.ok) {
        const data = await timingsRes.json();
        if (data.success && Array.isArray(data.doctors)) {
          const availableDocs = data.doctors.filter((doc: any) => {
            const isFullDayOff = noShows.some(
              (ns) =>
                (ns.doctorId === doc.id || ns.doctorId === doc.doctorId || ns.doctorName === (doc.doctorName || doc.name)) &&
                ns.type === "FULL_DAY"
            );
            return !isFullDayOff;
          });

          setRescheduleDoctors(availableDocs);

          if (availableDocs.length > 0) {
            const match = preferredDoctorName
              ? availableDocs.find((d: any) =>
                  (d.doctorName || d.name || "").toLowerCase().replace(/^dr\.?\s*/i, "").trim() ===
                  preferredDoctorName.toLowerCase().replace(/^dr\.?\s*/i, "").trim()
                )
              : null;
            setSelectedRescheduleDoctor(match || availableDocs[0]);
          } else {
            setSelectedRescheduleDoctor(null);
          }
          return;
        }
      }
      setRescheduleDoctors([]);
      setSelectedRescheduleDoctor(null);
    } catch (err) {
      console.warn("Failed to load reschedule doctors:", err);
      setRescheduleDoctors([]);
      setSelectedRescheduleDoctor(null);
    } finally {
      setLoadingRescheduleDoctors(false);
    }
  };

  const rescheduleSlotSessions = useMemo(() => {
    if (!selectedRescheduleDoctor) {
      return [
        {
          id: "default-morning",
          title: "Morning Shift (10:00 AM - 01:00 PM)",
          slots: [
            "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
            "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
            "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
          ],
        },
        {
          id: "default-evening",
          title: "Evening Shift (05:00 PM - 09:00 PM)",
          slots: [
            "05:00 PM", "05:15 PM", "05:30 PM", "05:45 PM",
            "06:00 PM", "06:15 PM", "06:30 PM", "06:45 PM",
            "07:00 PM", "07:15 PM", "07:30 PM", "07:45 PM",
            "08:00 PM", "08:15 PM", "08:30 PM", "08:45 PM",
          ],
        },
      ];
    }

    let ranges = selectedRescheduleDoctor.slots || [];
    if (ranges.length === 0) {
      ranges = [
        { displayText: "10:00 AM - 01:00 PM" },
        { displayText: "05:00 PM - 09:00 PM" },
      ];
    }

    return ranges.map((r: any, idx: number) => {
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

      if (endMin <= startMin) {
        endMin = startMin + 180;
      }

      const slots: string[] = [];
      for (let cur = startMin; cur < endMin; cur += 15) {
        slots.push(formatMinutesToTime(cur));
      }

      const shiftTitle = idx === 0 ? "Morning / Afternoon Shift" : "Evening Shift";
      return {
        id: `shift-${idx}`,
        title: `${shiftTitle} (${rText || `${formatMinutesToTime(startMin)} - ${formatMinutesToTime(endMin)}`})`,
        slots,
      };
    });
  }, [selectedRescheduleDoctor]);

  const openRescheduleModal = (appt: any) => {
    setRescheduleTargetAppt(appt);
    const initialDt = appt.appointmentDate || selectedDate || getTodayStr();
    setRescheduleDate(initialDt);
    setRescheduleSlot(appt.timeSlot || appt.selectedTimeSlot || "10:00 AM");
    setRescheduleShowCalendar(false);
    setRescheduleModalOpen(true);

    if (initialDt && initialDt.includes("-")) {
      const parts = initialDt.split("-");
      if (parts.length === 3) {
        const m = parts[0].length === 4 ? parseInt(parts[1], 10) - 1 : parseInt(parts[1], 10) - 1;
        const y = parts[0].length === 4 ? parseInt(parts[0], 10) : parseInt(parts[2], 10);
        setRescheduleCalMonth(m);
        setRescheduleCalYear(y);
      }
    }

    const bName = activeBranch?.name || appt.branch || "KPHB";
    fetchRescheduleDoctors(bName, initialDt, appt.doctorName);
  };

  const handleSelectRescheduleDate = (dt: string) => {
    setRescheduleDate(dt);
    setRescheduleShowCalendar(false);
    const bName = activeBranch?.name || rescheduleTargetAppt?.branch || "KPHB";
    fetchRescheduleDoctors(bName, dt, selectedRescheduleDoctor?.name || selectedRescheduleDoctor?.doctorName || rescheduleTargetAppt?.doctorName);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTargetAppt) return;
    setIsRescheduling(true);
    try {
      const docId = selectedRescheduleDoctor?.doctorId || selectedRescheduleDoctor?.id || rescheduleTargetAppt.doctorId;
      const docName = selectedRescheduleDoctor?.doctorName || selectedRescheduleDoctor?.name || rescheduleTargetAppt.doctorName;

      const data = await apiFetch<any>("/reception/appointments", {
        method: "PATCH",
        body: JSON.stringify({
          action: "RESCHEDULE",
          id: rescheduleTargetAppt.id,
          appointmentDate: rescheduleDate,
          timeSlot: rescheduleSlot,
          doctorId: docId,
          doctorName: docName,
        }),
      });
      if (data.success) {
        Alert.alert(
          "Rescheduled Successfully",
          `Appointment for ${rescheduleTargetAppt.patientName} moved to ${rescheduleDate} at ${rescheduleSlot}${docName ? ` with ${docName}` : ""}!`
        );
        lastVerifiedAtRef.current = Date.now();
        setRescheduleModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["appointments-list", cleanBranchName] });
        queryClient.invalidateQueries({ queryKey: ["appointments-summary", cleanBranchName] });
      } else {
        Alert.alert("Error", data.error || "Failed to reschedule appointment.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsRescheduling(false);
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

  const handleSelectCalDate = (dayNum: number) => {
    const d = String(dayNum).padStart(2, "0");
    const m = String(calMonth + 1).padStart(2, "0");
    setSelectedDate(`${d}-${m}-${calYear}`);
    setCalendarModalOpen(false);
  };

  // Side Drawer Animation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setIsDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDrawerOpen(false);
    });
  };

  const handleNavigate = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  const handleLogout = async () => {
    closeDrawer();
    await clearAllAuthData();
    router.replace("/(auth)/login");
  };

  const branchShortName = cleanBranchName || "KPHB";

  const navMenuItems = [
    { id: "dashboard", title: "Dashboard", icon: "grid-outline", route: "/(reception)" },
    { id: "appointments", title: "Appointments", icon: "calendar-outline", route: "/(reception)/appointments" },
    { id: "all-patients", title: "All Patients List", icon: "people-outline", route: "/(reception)/all-patients" },
    { id: "old-entry", title: "Old Entry (Rx)", icon: "folder-open-outline", route: "/(reception)/old-entry" },
    { id: "follow-ups", title: "Follow-ups", icon: "call-outline", route: "/(reception)/follow-ups" },
    { id: "medical-requests", title: "Medical Requests", icon: "document-text-outline", route: "/(reception)/medical-requests" },
    { id: "shared-media", title: "Shared Media", icon: "folder-open-outline", route: "/(reception)/shared-media" },
    { id: "shiprocket", title: "Shiprocket", icon: "cube-outline", route: "/(reception)/shiprocket" },
    { id: "doctor-no-show", title: "Doctor No-Show", icon: "person-remove-outline", route: "/(reception)/doctor-no-show" },
    { id: "branch-cleaning", title: "Branch Cleaning", icon: "sparkles-outline", route: "/(reception)/branch-cleaning" },
  ];

  // List Header Component for FlatList
  const renderListHeader = () => {
    return (
      <View style={{ paddingTop: 12 }}>
        {/* 2. BRANCH TARGET CARD */}
        <View style={styles.targetCard}>
          <View style={styles.targetCardHeader}>
            <View style={styles.targetTitleRow}>
              <Ionicons name="radio-button-on" size={20} color={COLORS.themeBlue} />
              <Text style={styles.targetCardTitle}>{branchShortName} Branch Target</Text>
            </View>
            <View style={styles.achievedPill}>
              <Ionicons name="trending-up" size={14} color={COLORS.themeBlue} />
              <Text style={styles.achievedPillText}>
                {branchTarget ? `${branchTarget.percentage}% Achieved` : "0% Achieved"}
              </Text>
            </View>
          </View>

          {/* 3 Metric Columns */}
          <View style={styles.targetMetricsBox}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TARGET GOAL</Text>
              <Text style={styles.metricGoalValue}>
                ₹{branchTarget?.targetGoal ? branchTarget.targetGoal.toLocaleString() : "0"}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TARGET REACHED</Text>
              <Text style={styles.metricReachedValue}>
                ₹{branchTarget?.targetReached ? branchTarget.targetReached.toLocaleString() : "0"}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>REMAINING</Text>
              <Text style={styles.metricRemainingValue}>
                ₹{branchTarget?.remaining ? branchTarget.remaining.toLocaleString() : "0"}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, branchTarget?.percentage || 0)}%` },
              ]}
            />
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.remainingCaption}>
              ₹{branchTarget?.remaining ? branchTarget.remaining.toLocaleString() : "0"} remaining.
            </Text>
            <Text style={styles.percentCaption}>{branchTarget?.percentage || 0}%</Text>
          </View>
        </View>

        {/* 3. OVERVIEW SECTION */}
        <View style={styles.overviewSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.overviewTitleRow}>
              <Text style={styles.sectionMainTitle}>Overview</Text>
              {isOnline ? (
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => checkConnection()}
                  style={[styles.livePill, { backgroundColor: "#ffe4e6", borderColor: "#fecdd3" }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.liveDot, { backgroundColor: "#e11d48" }]} />
                  <Text style={[styles.liveText, { color: "#e11d48" }]}>OFFLINE</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.themeBlue} />
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: COLORS.themeBlue }}>
                {selectedDate}
              </Text>
            </View>
          </View>

          {/* Top 4 Stats Cards (Switchable Tabs) */}
          <View style={styles.overviewGrid}>
            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "ALL" && styles.overviewStatCardActiveBlue]}
              onPress={() => setActiveFilter("ALL")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigBlue}>{totalCount}</Text>
              <Text style={styles.statCardSubtitle}>Total Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "UPCOMING" && styles.overviewStatCardActiveBlue]}
              onPress={() => setActiveFilter("UPCOMING")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigBlue}>{waitingCount}</Text>
              <Text style={styles.statCardSubtitle}>Waiting</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "ACTIVE" && styles.overviewStatCardActiveOrange]}
              onPress={() => setActiveFilter("ACTIVE")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigOrange}>{inConsultationCount}</Text>
              <Text style={styles.statCardSubtitle}>Active Consult</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.overviewStatCard, activeFilter === "COMPLETED" && styles.overviewStatCardActiveGreen]}
              onPress={() => setActiveFilter("COMPLETED")}
              activeOpacity={0.7}
            >
              <Text style={styles.statBigGreen}>{completedCount}</Text>
              <Text style={styles.statCardSubtitle}>Completed</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom 3 Stats Cards */}
          <View style={styles.subStatsRow}>
            <TouchableOpacity
              style={styles.subStatCard}
              onPress={() => setActiveFilter("COLLECT_FEE")}
              activeOpacity={0.8}
            >
              <Text style={styles.subStatRed}>{collectFeeCount}</Text>
              <Text style={styles.subStatTextRed}>Pay Pending →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subStatCard}
              onPress={() => {
                setFollowUpModalType("OPTED");
                setFollowUpModalSearch("");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.subStatBlue}>{optedFollowUpCount}</Text>
              <Text style={styles.subStatTextBlue}>Follow-up Opted →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subStatCard}
              onPress={() => {
                setFollowUpModalType("NOT_OPTED");
                setFollowUpModalSearch("");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.subStatSlate}>{notOptedFollowUpCount}</Text>
              <Text style={styles.subStatTextSlate}>Not Opted →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. DATE FILTER & RESTORE OPTION */}
        <View style={styles.upcomingSection}>
          <View style={styles.upcomingHeaderRow}>
            <View style={styles.upcomingTitleBadgeRow}>
              <Text style={styles.upcomingTitle}>Appointments Schedule</Text>
              <View style={styles.upcomingCountBadge}>
                <Text style={styles.upcomingCountText}>{totalCount}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.restoreBtn} onPress={handleOpenRestoreModal} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={13} color={COLORS.themeBlue} />
              <Text style={styles.restoreBtnText}>Restore (24h)</Text>
            </TouchableOpacity>
          </View>

          {/* QUICK DATE PILLS: Yesterday, Today, Tomorrow & Calendar */}
          <View style={styles.dateFilterContainer}>
            <View style={styles.datePillsRow}>
              <TouchableOpacity
                style={[styles.datePill, selectedDate === yesterdayStr && styles.datePillActive]}
                onPress={() => {
                  setSelectedDate(yesterdayStr);
                  setCompletedLimit(20);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.datePillText, selectedDate === yesterdayStr && styles.datePillTextActive]}>
                  Yesterday
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePill, selectedDate === todayStr && styles.datePillActive]}
                onPress={() => {
                  setSelectedDate(todayStr);
                  setCompletedLimit(20);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.datePillText, selectedDate === todayStr && styles.datePillTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePill, selectedDate === tomorrowStr && styles.datePillActive]}
                onPress={() => {
                  setSelectedDate(tomorrowStr);
                  setCompletedLimit(20);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.datePillText, selectedDate === tomorrowStr && styles.datePillTextActive]}>
                  Tomorrow
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePillCalendar,
                  selectedDate !== yesterdayStr && selectedDate !== todayStr && selectedDate !== tomorrowStr && styles.datePillActive,
                ]}
                onPress={() => {
                  setCalYear(new Date().getFullYear());
                  setCalMonth(new Date().getMonth());
                  setCalendarModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={selectedDate !== yesterdayStr && selectedDate !== todayStr && selectedDate !== tomorrowStr ? COLORS.white : COLORS.themeBlue}
                />
                <Text
                  style={[
                    styles.datePillText,
                    selectedDate !== yesterdayStr && selectedDate !== todayStr && selectedDate !== tomorrowStr && styles.datePillTextActive,
                  ]}
                >
                  {selectedDate !== yesterdayStr && selectedDate !== todayStr && selectedDate !== tomorrowStr ? selectedDate : "Calendar"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color={selectedDate !== yesterdayStr && selectedDate !== todayStr && selectedDate !== tomorrowStr ? COLORS.white : COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* SEGMENTED FILTER TABS */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "UPCOMING" && styles.filterPillActiveUpcoming]}
              onPress={() => setActiveFilter("UPCOMING")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "UPCOMING" && styles.filterPillTextActive]}>
                Waiting ({waitingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "ACTIVE" && styles.filterPillActive]}
              onPress={() => setActiveFilter("ACTIVE")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "ACTIVE" && styles.filterPillTextActive]}>
                In Consult ({inConsultationCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "COLLECT_FEE" && styles.filterPillActiveOrange]}
              onPress={() => setActiveFilter("COLLECT_FEE")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "COLLECT_FEE" && styles.filterPillTextActive]}>
                Collect Fee ({collectFeeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "COMPLETED" && styles.filterPillActiveGreen]}
              onPress={() => setActiveFilter("COMPLETED")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "COMPLETED" && styles.filterPillTextActive]}>
                Completed ({completedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === "ALL" && styles.filterPillActive]}
              onPress={() => setActiveFilter("ALL")}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === "ALL" && styles.filterPillTextActive]}>
                All ({totalCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // List Footer Component (Load More Completed button)
  const renderListFooter = () => {
    if (activeFilter === "COMPLETED" && completedAppointments.length > completedLimit) {
      return (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={() => setCompletedLimit((prev) => prev + 20)}
          activeOpacity={0.8}
        >
          <Text style={styles.loadMoreBtnText}>
            Load More Completed ({completedAppointments.length - completedLimit} remaining)
          </Text>
        </TouchableOpacity>
      );
    }
    return <View style={{ height: 20 }} />;
  };

  // Empty List Component
  const renderListEmpty = () => {
    if (isLoadingAppointments && appointments.length === 0) {
      return (
        <View style={{ padding: 32, alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" color={COLORS.themeBlue} />
          <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
            Loading appointments for {selectedDate}...
          </Text>
        </View>
      );
    }

    if (!isOnline) {
      return (
        <View style={[styles.emptyAppointmentsCard, { borderColor: "#fecdd3", backgroundColor: "#fff1f2" }]}>
          <View style={[styles.calendarIconBox, { backgroundColor: "#ffe4e6" }]}>
            <Ionicons name="cloud-offline-outline" size={32} color="#e11d48" />
          </View>

          <Text style={[styles.emptyCardMessage, { color: "#9f1239", fontWeight: "800" }]}>
            No Internet Connection
          </Text>

          <Text style={{ fontSize: 11.5, color: "#be123c", textAlign: "center", paddingHorizontal: 12 }}>
            You are currently offline. Switching between Wi-Fi and Mobile Data will automatically reconnect.
          </Text>

          <TouchableOpacity
            style={[styles.bookAppointmentBtn, { backgroundColor: "#e11d48", marginTop: 6 }]}
            onPress={() => checkConnection()}
            activeOpacity={0.85}
          >
            <Ionicons name="reload" size={18} color={COLORS.white} />
            <Text style={styles.bookAppointmentBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyAppointmentsCard}>
        <View style={styles.calendarIconBox}>
          <Ionicons name="calendar-outline" size={32} color={COLORS.textLight} />
        </View>

        <Text style={styles.emptyCardMessage}>
          No appointments found in this section for {selectedDate}.
        </Text>

        <TouchableOpacity
          style={styles.bookAppointmentBtn}
          onPress={() => router.push("/(reception)/appointments" as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
          <Text style={styles.bookAppointmentBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* 1. TOP NAVBAR */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={openDrawer}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={26} color="#0f172a" />
          </TouchableOpacity>

          {/* User Profile Avatar */}
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color={COLORS.themeBlue} />
          </View>

          {/* User & Branch Info */}
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerMainTitle}>{branchShortName} Reception</Text>
            <Text style={styles.headerPhoneText}>
              {getBranchPhone(activeBranch?.name, activeBranch?.phone)}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.receptionBadge}>
                <Text style={styles.receptionBadgeText}>RECEPTION</Text>
              </View>
              <View style={styles.branchLocationPill}>
                <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.branchLocationText}>{branchShortName} Branch</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Action Icons: Notification Bell & Logout */}
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color="#0f172a" />
            <View style={styles.bellDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SINGLE VIRTUALIZED FLATLIST: Renders one group at a time, ultra-fast memory & scrolling */}
      <FlatList
        data={displayedAppointments}
        keyExtractor={(item, index) => item.id || item.token || `appt-${item.__variant}-${index}`}
        renderItem={({ item, index }) => (
          <AppointmentCard
            appt={item}
            index={item.__index ?? index}
            variant={item.__variant}
            isFirst={index === 0}
            isLast={index === displayedAppointments.length - 1}
            branchName={branchShortName}
            onOpenPatientFile={openPatientFile}
            onOpenPatientHistory={openPatientHistory}
            onStartConsultation={handleStartConsultation}
            onOpenPaymentModal={(appt) => {
              setSelectedPaymentAppt(appt);
              setPaymentModalVisible(true);
            }}
            onOpenInvoice={handleOpenInvoice}
            onShareInvoice={handleShareInvoice}
            onCallPatient={handleCallPatient}
            onWhatsAppPatient={(phone, name) => handleWhatsAppPatient(phone, name)}
            onOpenRescheduleModal={openRescheduleModal}
            onDeleteAppointment={handleDeleteAppointment}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        )}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderListEmpty}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            colors={[COLORS.themeBlue]}
            tintColor={COLORS.themeBlue}
          />
        }
      />

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.8}>
          <Ionicons name="grid" size={22} color={COLORS.themeBlue} />
          <Text style={[styles.tabLabel, { color: COLORS.themeBlue }]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(reception)/appointments" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Book Appt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.navigate("/(reception)/all-patients" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Patient List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/(reception)/medical-requests" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="medkit-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.tabLabel}>Med Req</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.errorRed} />
          <Text style={[styles.tabLabel, { color: COLORS.errorRed }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ANIMATED SIDE NAVIGATION DRAWER */}
      {isDrawerOpen && (
        <View style={styles.drawerOverlayContainer}>
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.drawerContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerLogoRow}>
                <Image
                  source={require("../../../assets/images/logo.png")}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
                <View style={styles.drawerTitleBox}>
                  <Text style={styles.drawerClinicName}>Spiritual Homeopathy</Text>
                  <View style={styles.drawerRoleBadge}>
                    <Text style={styles.drawerRoleText}>RECEPTION DESK</Text>
                  </View>
                </View>
              </View>

              <View style={styles.drawerBranchBox}>
                <View style={styles.drawerBranchTop}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.drawerBranchName} numberOfLines={1}>
                    {activeBranch?.name || "Clinic Branch"}
                  </Text>
                </View>
                <Text style={styles.drawerBranchPhone}>
                  📞 {getBranchPhone(activeBranch?.name, activeBranch?.phone)}
                </Text>
              </View>
            </View>

            {/* Navigation Menu List */}
            <ScrollView style={styles.drawerMenuList} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionLabel}>RECEPTION FOLDERS</Text>

              {navMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.drawerMenuItem}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.75}
                >
                  <View style={styles.drawerIconBox}>
                    <Ionicons name={item.icon as any} size={20} color={COLORS.themeBlue} />
                  </View>
                  <Text style={styles.drawerMenuText}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.drawerMenuItem, { marginTop: 14, marginBottom: 28 }]}
                onPress={handleLogout}
                activeOpacity={0.75}
              >
                <View style={styles.drawerIconBox}>
                  <Ionicons name="log-out-outline" size={20} color={COLORS.errorRed} />
                </View>
                <Text style={[styles.drawerMenuText, { color: COLORS.errorRed, fontWeight: "700" }]}>
                  Sign Out
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.errorRed} />
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* RESCHEDULE APPOINTMENT MODAL */}
      <Modal visible={rescheduleModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setRescheduleModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContainer, { maxWidth: 390, maxHeight: SCREEN_HEIGHT * 0.88, padding: 16 }]}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 10, marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="calendar" size={18} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>Reschedule Appointment</Text>
                      <Text style={{ fontSize: 10.5, color: "#64748b" }}>
                        {rescheduleTargetAppt?.patientName} • {rescheduleTargetAppt?.registrationId}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setRescheduleModalOpen(false)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="close" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                  {/* 1. Date Selection Row */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155" }}>
                      Select New Date: <Text style={{ color: "#0284c7", fontWeight: "800" }}>{rescheduleDate}</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => setRescheduleShowCalendar(!rescheduleShowCalendar)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: rescheduleShowCalendar ? "#0284c7" : "#e0f2fe" }}
                    >
                      <Ionicons name="calendar-outline" size={12} color={rescheduleShowCalendar ? "#ffffff" : "#0284c7"} />
                      <Text style={{ fontSize: 10.5, fontWeight: "700", color: rescheduleShowCalendar ? "#ffffff" : "#0284c7" }}>
                        {rescheduleShowCalendar ? "Hide Calendar" : "Pick Date"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quick Date Pills */}
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={[styles.datePill, rescheduleDate === todayStr && styles.datePillActive, { flex: 1, alignItems: "center" }]}
                      onPress={() => handleSelectRescheduleDate(todayStr)}
                    >
                      <Text style={[styles.datePillText, rescheduleDate === todayStr && styles.datePillTextActive, { fontSize: 11 }]}>
                        Today
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.datePill, rescheduleDate === tomorrowStr && styles.datePillActive, { flex: 1, alignItems: "center" }]}
                      onPress={() => handleSelectRescheduleDate(tomorrowStr)}
                    >
                      <Text style={[styles.datePillText, rescheduleDate === tomorrowStr && styles.datePillTextActive, { fontSize: 11 }]}>
                        Tomorrow
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Inline Calendar View */}
                  {rescheduleShowCalendar && (
                    <View style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            if (rescheduleCalMonth === 0) {
                              setRescheduleCalMonth(11);
                              setRescheduleCalYear(rescheduleCalYear - 1);
                            } else {
                              setRescheduleCalMonth(rescheduleCalMonth - 1);
                            }
                          }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="chevron-back" size={16} color="#0f172a" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a" }}>
                          {monthNames[rescheduleCalMonth]} {rescheduleCalYear}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            if (rescheduleCalMonth === 11) {
                              setRescheduleCalMonth(0);
                              setRescheduleCalYear(rescheduleCalYear + 1);
                            } else {
                              setRescheduleCalMonth(rescheduleCalMonth + 1);
                            }
                          }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="chevron-forward" size={16} color="#0f172a" />
                        </TouchableOpacity>
                      </View>

                      {/* Weekday headers */}
                      <View style={{ flexDirection: "row", marginBottom: 4 }}>
                        {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
                          <Text key={idx} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: "700", color: "#64748b" }}>
                            {w}
                          </Text>
                        ))}
                      </View>

                      {/* Days Grid */}
                      {(() => {
                        const daysInM = new Date(rescheduleCalYear, rescheduleCalMonth + 1, 0).getDate();
                        const offset = new Date(rescheduleCalYear, rescheduleCalMonth, 1).getDay();
                        return (
                          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                            {Array.from({ length: offset }).map((_, i) => (
                              <View key={`empty-${i}`} style={{ width: "14.28%", height: 32 }} />
                            ))}
                            {Array.from({ length: daysInM }).map((_, i) => {
                              const dayNum = i + 1;
                              const dtStr = `${String(dayNum).padStart(2, "0")}-${String(rescheduleCalMonth + 1).padStart(2, "0")}-${rescheduleCalYear}`;
                              const isSel = rescheduleDate === dtStr;
                              return (
                                <TouchableOpacity
                                  key={dayNum}
                                  onPress={() => handleSelectRescheduleDate(dtStr)}
                                  style={{ width: "14.28%", height: 32, alignItems: "center", justifyContent: "center" }}
                                >
                                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isSel ? "#0284c7" : "transparent", alignItems: "center", justifyContent: "center" }}>
                                    <Text style={{ fontSize: 11, fontWeight: isSel ? "800" : "600", color: isSel ? "#ffffff" : "#0f172a" }}>
                                      {dayNum}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* 2. Consulting Doctor Selection */}
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155" }}>
                        Consulting Doctor ({getDayOfWeekAbbr(rescheduleDate)}) *
                      </Text>
                      {rescheduleDoctors.length > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#16a34a" }} />
                          <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#16a34a" }}>
                            {rescheduleDoctors.length} On Duty
                          </Text>
                        </View>
                      )}
                    </View>

                    {loadingRescheduleDoctors ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}>
                        <ActivityIndicator size="small" color="#0284c7" />
                        <Text style={{ fontSize: 11, color: "#64748b" }}>Checking doctor schedule...</Text>
                      </View>
                    ) : rescheduleDoctors.length === 0 ? (
                      <View style={{ backgroundColor: "#fef3c7", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#fde68a" }}>
                        <Text style={{ fontSize: 10.5, color: "#92400e", fontWeight: "600" }}>
                          No doctors scheduled at {activeBranch?.name || "this branch"} on {getDayOfWeekAbbr(rescheduleDate)}. Keeping current doctor: {rescheduleTargetAppt?.doctorName || "Doctor"}.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 2 }}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {rescheduleDoctors.map((doc: any) => {
                            const dName = doc.doctorName || doc.name;
                            const isSel =
                              (selectedRescheduleDoctor?.doctorId || selectedRescheduleDoctor?.id) === (doc.doctorId || doc.id) ||
                              selectedRescheduleDoctor?.doctorName === dName ||
                              selectedRescheduleDoctor?.name === dName;
                            return (
                              <TouchableOpacity
                                key={doc.doctorId || doc.id || dName}
                                onPress={() => setSelectedRescheduleDoctor(doc)}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 7,
                                  borderRadius: 10,
                                  borderWidth: 1.5,
                                  borderColor: isSel ? "#0284c7" : "#e2e8f0",
                                  backgroundColor: isSel ? "#f0f9ff" : "#ffffff",
                                  minWidth: 110,
                                }}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                  <Ionicons name="medkit" size={13} color={isSel ? "#0284c7" : "#64748b"} />
                                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: isSel ? "#0284c7" : "#0f172a" }}>
                                    {dName}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 9.5, color: "#64748b", marginTop: 2 }}>
                                  {doc.specialty || "Homeopathic Consultant"}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    )}
                  </View>

                  {/* 3. Time Slot Picker */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155", marginBottom: 6 }}>
                      Select Time Slot: <Text style={{ color: "#0284c7", fontWeight: "800" }}>{rescheduleSlot}</Text>
                    </Text>

                    <View style={{ gap: 10 }}>
                      {rescheduleSlotSessions.map((s: any) => (
                        <View key={s.id} style={{ backgroundColor: "#f8fafc", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "#f1f5f9" }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>
                            {s.title}
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            {s.slots.map((slot: string) => {
                              const isSel = rescheduleSlot === slot;
                              return (
                                <TouchableOpacity
                                  key={slot}
                                  onPress={() => setRescheduleSlot(slot)}
                                  style={[
                                    { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
                                    isSel && { backgroundColor: "#0284c7", borderColor: "#0284c7" },
                                  ]}
                                >
                                  <Text style={[{ fontSize: 10.5, fontWeight: "700", color: "#334155" }, isSel && { color: "#ffffff" }]}>
                                    {slot}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={() => setRescheduleModalOpen(false)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f1f5f9" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={isRescheduling}
                    onPress={handleConfirmReschedule}
                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#0284c7" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "800", color: "#ffffff" }}>
                      {isRescheduling ? "Saving..." : "Confirm Reschedule"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* CALENDAR DATE PICKER MODAL */}
      <Modal visible={calendarModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setCalendarModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                {/* Month / Year Header */}
                <View style={styles.calNavHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      if (calMonth === 0) {
                        setCalMonth(11);
                        setCalYear(calYear - 1);
                      } else {
                        setCalMonth(calMonth - 1);
                      }
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="chevron-back" size={20} color="#0f172a" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#0f172a" }}>
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
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Weekdays */}
                <View style={styles.calWeekdaysRow}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
                    <Text key={idx} style={styles.calWeekdayText}>{w}</Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {Array.from({ length: firstDayOffset }).map((_, i) => (
                    <View key={`empty-${i}`} style={{ width: "14.28%", height: 38 }} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${String(dayNum).padStart(2, "0")}-${String(calMonth + 1).padStart(2, "0")}-${calYear}`;
                    const isSelected = selectedDate === dateStr;
                    return (
                      <TouchableOpacity
                        key={dayNum}
                        onPress={() => handleSelectCalDate(dayNum)}
                        style={{
                          width: "14.28%",
                          height: 38,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: isSelected ? "#0284c7" : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? "800" : "600",
                              color: isSelected ? "#ffffff" : "#0f172a",
                            }}
                          >
                            {dayNum}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setCalendarModalOpen(false)}
                  style={{
                    marginTop: 14,
                    paddingVertical: 10,
                    backgroundColor: "#f1f5f9",
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569" }}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 24-HOUR RESTORE DELETED APPOINTMENTS MODAL */}
      <Modal visible={isRestoreModalOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsRestoreModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContainer,
                  { maxHeight: Dimensions.get("window").height * 0.78, width: "92%" },
                ]}
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#f0f9ff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="reload" size={16} color={COLORS.themeBlue} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>
                        Restore Appointments (24h)
                      </Text>
                      <Text style={{ fontSize: 10.5, color: "#64748b" }}>
                        Cancelled bookings restorable for 24 hours
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIsRestoreModalOpen(false)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                {isLoadingDeleted ? (
                  <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color={COLORS.themeBlue} />
                    <Text style={{ fontSize: 12, color: "#64748b" }}>Loading deleted appointments...</Text>
                  </View>
                ) : deletedAppointments.length === 0 ? (
                  <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
                    <Ionicons name="trash-outline" size={32} color="#cbd5e1" />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569" }}>
                      No deleted appointments
                    </Text>
                    <Text style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                      No bookings have been deleted in the past 24 hours for {branchShortName}.
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 8 }}>
                      {deletedAppointments.map((item) => (
                        <View
                          key={item.id}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                            backgroundColor: "#ffffff",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  backgroundColor: "#f0f9ff",
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: "#bae6fd",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: "800",
                                    color: COLORS.themeBlue,
                                  }}
                                >
                                  {item.token}
                                </Text>
                              </View>
                              <Text
                                style={{ fontSize: 12.5, fontWeight: "800", color: "#0f172a" }}
                                numberOfLines={1}
                              >
                                {item.patientName}
                              </Text>
                            </View>

                            <Text style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                              👨‍⚕️ {item.doctorName} • {item.appointmentDate} @ {item.timeSlot}
                            </Text>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                marginTop: 3,
                              }}
                            >
                              <Ionicons name="time-outline" size={11} color="#d97706" />
                              <Text style={{ fontSize: 10, fontWeight: "700", color: "#d97706" }}>
                                {item.hoursRemaining}h left to restore
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            onPress={() =>
                              handleRestoreAppointment(item.id, item.token, item.patientName)
                            }
                            style={{
                              backgroundColor: "#16a34a",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="reload" size={11} color="#ffffff" />
                            <Text style={{ fontSize: 11, fontWeight: "800", color: "#ffffff" }}>
                              Restore
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {/* Footer */}
                <TouchableOpacity
                  onPress={() => setIsRestoreModalOpen(false)}
                  style={{
                    marginTop: 12,
                    paddingVertical: 10,
                    backgroundColor: "#f1f5f9",
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#475569" }}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Appointment Payment Modal (Collect Fee) */}
      <AppointmentPaymentModal
        visible={paymentModalVisible}
        appointment={selectedPaymentAppt}
        allAppointments={appointments}
        onClose={() => {
          setPaymentModalVisible(false);
          setSelectedPaymentAppt(null);
        }}
        onPaymentSuccess={() => {
          lastVerifiedAtRef.current = Date.now();
          queryClient.invalidateQueries({ queryKey: ["appointments-list", cleanBranchName] });
          queryClient.invalidateQueries({ queryKey: ["appointments-summary", cleanBranchName] });
          if (activeBranch?.name) {
            fetchBranchTarget(activeBranch.name);
          }
        }}
        onOpenPatientFile={() => {
          setPaymentModalVisible(false);
          if (selectedPaymentAppt) {
            openPatientFile(selectedPaymentAppt);
          }
        }}
      />

      {/* FOLLOW-UP OPTED / NOT OPTED MODAL */}
      <Modal visible={!!followUpModalType} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setFollowUpModalType(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContainer,
                  {
                    height: Dimensions.get("window").height * 0.85,
                    maxHeight: Dimensions.get("window").height * 0.88,
                    width: "94%",
                    maxWidth: 480,
                    padding: 0,
                    overflow: "hidden",
                  },
                ]}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f1f5f9",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: followUpModalType === "OPTED" ? "#f0fdf4" : "#f1f5f9",
                        borderWidth: 1,
                        borderColor: followUpModalType === "OPTED" ? "#bbf7d0" : "#e2e8f0",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={followUpModalType === "OPTED" ? "checkmark-circle" : "alert-circle"}
                        size={20}
                        color={followUpModalType === "OPTED" ? "#16a34a" : "#64748b"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a" }}>
                          {followUpModalType === "OPTED" ? "Follow-up Opted" : "Follow-up Not Opted"}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 10,
                            backgroundColor: followUpModalType === "OPTED" ? "#dcfce7" : "#e2e8f0",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "800",
                              color: followUpModalType === "OPTED" ? "#15803d" : "#475569",
                            }}
                          >
                            {currentFollowUpList.length}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {selectedDate} • {branchShortName}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setFollowUpModalType(null)}
                    style={{ padding: 6, borderRadius: 20, backgroundColor: "#f1f5f9" }}
                  >
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Subheader: Opted / Not Opted Tabs */}
                <View
                  style={{
                    flexDirection: "row",
                    paddingHorizontal: 14,
                    paddingTop: 10,
                    paddingBottom: 6,
                    gap: 8,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setFollowUpModalType("OPTED")}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: followUpModalType === "OPTED" ? "#0284c7" : "#f1f5f9",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: "800",
                        color: followUpModalType === "OPTED" ? "#ffffff" : "#64748b",
                      }}
                    >
                      Opted ({optedFollowUpAppointments.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setFollowUpModalType("NOT_OPTED")}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: followUpModalType === "NOT_OPTED" ? "#475569" : "#f1f5f9",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: "800",
                        color: followUpModalType === "NOT_OPTED" ? "#ffffff" : "#64748b",
                      }}
                    >
                      Not Opted ({notOptedFollowUpAppointments.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView
                  style={{ flex: 1, paddingHorizontal: 14, marginVertical: 10 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={true}
                  persistentScrollbar={true}
                  nestedScrollEnabled={true}
                >
                  {currentFollowUpList.length === 0 ? (
                    <View style={{ padding: 32, alignItems: "center", gap: 6 }}>
                      <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569" }}>
                        No patients found
                      </Text>
                      <Text style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                        There are no patients in this category for {selectedDate}.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8, paddingBottom: 10 }}>
                      {currentFollowUpList.map((item, idx) => {
                        const patName = item.patientName || item.name || "Patient";
                        const rawPhone = item.phoneNumber || item.phone || "";
                        const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
                        const displayPhone = cleanPhone ? `+91 ${cleanPhone}` : rawPhone || "No Mobile";
                        const regId = item.registrationId || item.patientId || item.mrn || `SPH-${item.id?.slice(0, 6) || "GEN"}`;
                        const docName = item.doctorName || "Doctor";

                        return (
                          <View
                            key={item.id || `fu-${idx}`}
                            style={{
                              padding: 12,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              backgroundColor: "#ffffff",
                              gap: 8,
                            }}
                          >
                            {/* Patient Name & Token */}
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                                <View
                                  style={{
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    backgroundColor: "#f0f9ff",
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: "#bae6fd",
                                  }}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: "800", color: COLORS.themeBlue }}>
                                    Token #{item.token || idx + 1}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a", flex: 1 }} numberOfLines={1}>
                                  {patName}
                                </Text>
                              </View>
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  backgroundColor: "#f8fafc",
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: "#e2e8f0",
                                }}
                              >
                                <Text style={{ fontSize: 10, fontFamily: "monospace", color: "#475569", fontWeight: "700" }}>
                                  ID: {regId}
                                </Text>
                              </View>
                            </View>

                            {/* Mobile Phone & Doctor / Timing */}
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                <Ionicons name="call-outline" size={12} color="#0284c7" />
                                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0f172a" }}>
                                  {displayPhone}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10.5, color: "#64748b" }}>
                                👨‍⚕️ Dr. {docName} • {item.timeSlot || "Scheduled"}
                              </Text>
                            </View>

                            {/* Status Info */}
                            {followUpModalType === "OPTED" ? (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                  backgroundColor: "#f0fdf4",
                                  borderWidth: 1,
                                  borderColor: "#bbf7d0",
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                }}
                              >
                                <Ionicons name="calendar" size={12} color="#16a34a" />
                                <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#166534" }}>
                                  Next Follow-up: {item.followUpDate || "Scheduled"}{" "}
                                  {item.followUpInterval ? `(${item.followUpInterval})` : ""}
                                </Text>
                              </View>
                            ) : (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                  backgroundColor: "#f8fafc",
                                  borderWidth: 1,
                                  borderColor: "#e2e8f0",
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                }}
                              >
                                <Ionicons name="information-circle-outline" size={12} color="#94a3b8" />
                                <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#64748b" }}>
                                  No follow-up scheduled for this visit
                                </Text>
                              </View>
                            )}

                            {/* Actions Row */}
                            {cleanPhone ? (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: 8,
                                  borderTopWidth: 1,
                                  borderTopColor: "#f1f5f9",
                                  paddingTop: 6,
                                }}
                              >
                                <TouchableOpacity
                                  onPress={() => handleCallPatient(cleanPhone)}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    backgroundColor: "#f0f9ff",
                                    borderWidth: 1,
                                    borderColor: "#bae6fd",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Ionicons name="call" size={11} color={COLORS.themeBlue} />
                                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: COLORS.themeBlue }}>
                                    Call
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleWhatsAppPatient(cleanPhone, patName)}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    backgroundColor: "#f0fdf4",
                                    borderWidth: 1,
                                    borderColor: "#bbf7d0",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Ionicons name="logo-whatsapp" size={11} color="#16a34a" />
                                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#166534" }}>
                                    WhatsApp
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>

                {/* Footer */}
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: "#f1f5f9",
                    backgroundColor: "#f8fafc",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#64748b" }}>
                    Showing {currentFollowUpList.length} patient(s)
                  </Text>
                  <TouchableOpacity
                    onPress={() => setFollowUpModalType(null)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: "#e2e8f0",
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#334155" }}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // 1. TOP BAR
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: COLORS.white,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  hamburgerButton: {
    padding: 6,
    marginRight: 6,
    borderRadius: 8,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerMainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerPhoneText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  receptionBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  receptionBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0284c7",
    letterSpacing: 0.5,
  },
  branchLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  branchLocationText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  headerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },

  // MAIN CONTAINER
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 90,
  },

  // 2. TARGET CARD
  targetCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  targetCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  targetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  achievedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  achievedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  targetMetricsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  metricColumn: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#e2e8f0",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricGoalValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricReachedValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16a34a",
  },
  metricRemainingValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284c7",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0284c7",
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remainingCaption: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  percentCaption: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },

  // 3. OVERVIEW SECTION
  overviewSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionMainTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a",
  },

  // Top 4 Stat Cards
  overviewGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  overviewStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  overviewStatCardActiveBlue: {
    borderColor: "#0284c7",
    borderWidth: 1.5,
    backgroundColor: "#f0f9ff",
  },
  overviewStatCardActiveOrange: {
    borderColor: "#f97316",
    borderWidth: 1.5,
    backgroundColor: "#fff7ed",
  },
  overviewStatCardActiveGreen: {
    borderColor: "#16a34a",
    borderWidth: 1.5,
    backgroundColor: "#f0f9ff",
  },
  statBigBlue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0284c7",
    marginBottom: 1,
  },
  statBigOrange: {
    fontSize: 16,
    fontWeight: "900",
    color: "#d97706",
    marginBottom: 1,
  },
  statBigGreen: {
    fontSize: 16,
    fontWeight: "900",
    color: "#16a34a",
    marginBottom: 1,
  },
  statCardSubtitle: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 11,
  },

  // Sub Stats 3 Row
  subStatsRow: {
    flexDirection: "row",
    gap: 6,
  },
  subStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  subStatRed: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ef4444",
  },
  subStatTextRed: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#ef4444",
    marginTop: 1,
  },
  subStatBlue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0284c7",
  },
  subStatTextBlue: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#0284c7",
    marginTop: 1,
  },
  subStatSlate: {
    fontSize: 15,
    fontWeight: "900",
    color: "#64748b",
  },
  subStatTextSlate: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 1,
  },

  // 4. FILTER PILLS
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterPillActiveUpcoming: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterPillActiveOrange: {
    backgroundColor: "#f97316",
    borderColor: "#f97316",
  },
  filterPillActiveGreen: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  filterPillTextActive: {
    color: COLORS.white,
    fontWeight: "800",
  },

  // 5. APPOINTMENTS STACK SECTIONS & BOXES
  upcomingSection: {
    marginBottom: 8,
  },
  upcomingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  upcomingTitleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  upcomingCountBadge: {
    backgroundColor: "#e0f2fe",
    minWidth: 22,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  upcomingCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },

  // Date Filter below Restore (24h)
  dateFilterContainer: {
    marginBottom: 14,
  },
  datePillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  datePillCalendar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  datePillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  datePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  datePillTextActive: {
    color: "#ffffff",
  },

  // Load More Button
  loadMoreBtn: {
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 10,
    alignItems: "center",
  },
  loadMoreBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803d",
  },

  // Empty Appointments Card
  emptyAppointmentsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  calendarIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyCardMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  bookAppointmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 26,
    shadowColor: "#0284c7",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookAppointmentBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  // 6. FIXED BOTTOM TAB BAR
  bottomTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // 7. SIDEBAR DRAWER STYLES
  drawerOverlayContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  drawerBackdrop: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 16,
    justifyContent: "space-between",
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 48,
    borderBottomWidth: 0,
    backgroundColor: COLORS.white,
  },
  drawerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  drawerLogo: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  drawerTitleBox: {
    flex: 1,
  },
  drawerClinicName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  drawerRoleBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 2,
  },
  drawerRoleText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  drawerBranchBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 0,
  },
  drawerBranchTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  drawerBranchName: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  drawerBranchPhone: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  drawerMenuList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
    backgroundColor: "transparent",
  },
  drawerIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1e293b",
  },

  // Calendar Modal
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
  },
});
