import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Linking,
  Alert,
  BackHandler,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";
import { normalizeDateStr } from "../../../utils/dateUtils";

const PAGE_SIZE = 25;

type SessionTab = "TODAY" | "YESTERDAY" | "ALL";

const COLORS = {
  primary: "#0284c7",
  primaryDark: "#0369a1",
  success: "#16a34a",
  warning: "#d97706",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

export default function ReceptionAllPatientsScreen() {
  const router = useRouter();

  // State
  const [search, setSearch] = useState("");
  const [session, setSession] = useState<SessionTab>("TODAY");
  const [patients, setPatients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [sessionCounts, setSessionCounts] = useState<Record<SessionTab, number>>({ TODAY: 0, YESTERDAY: 0, ALL: 0 });

  // Load branch on mount
  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  // Fetch patients for the current tab/page
  const fetchPatients = useCallback(
    async (tab: SessionTab, page: number, isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const branchName = activeBranch?.name || activeBranch?.branch || "";
        const params = new URLSearchParams({
          session: tab,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (branchName) params.set("branch", branchName);

        const data = await apiFetch<any>(`/reception/patients?${params.toString()}`);
        if (data.success) {
          setPatients(data.patients || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(data.currentPage || 1);
        }
      } catch (err) {
        console.error("Failed to fetch patients:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeBranch]
  );

  // Fetch counts for each session tab
  const fetchSessionCounts = useCallback(async () => {
    const branchName = activeBranch?.name || activeBranch?.branch || "";
    const tabs: SessionTab[] = ["TODAY", "YESTERDAY", "ALL"];
    const counts: Record<SessionTab, number> = { TODAY: 0, YESTERDAY: 0, ALL: 0 };
    await Promise.all(
      tabs.map(async (tab) => {
        try {
          const params = new URLSearchParams({ session: tab, page: "1", pageSize: "1" });
          if (branchName) params.set("branch", branchName);
          const data = await apiFetch<any>(`/reception/patients?${params.toString()}`);
          if (data.success) counts[tab] = data.totalCount || 0;
        } catch {}
      })
    );
    setSessionCounts(counts);
  }, [activeBranch]);

  // On branch load / tab change — reset to page 1
  useEffect(() => {
    if (activeBranch !== null) {
      fetchPatients(session, 1);
      fetchSessionCounts();
    }
  }, [activeBranch, session]);

  const handleTabChange = (tab: SessionTab) => {
    setSession(tab);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) fetchPatients(session, currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) fetchPatients(session, currentPage + 1);
  };

  const handleRefresh = () => fetchPatients(session, currentPage, true);

  // Local search filter on current page
  const filteredPatients = search.trim()
    ? patients.filter((p) => {
        const q = search.toLowerCase();
        return (
          (p.name || p.patientName || "").toLowerCase().includes(q) ||
          (p.phone || "").includes(q) ||
          (p.regId || p.registrationId || "").toLowerCase().includes(q)
        );
      })
    : patients;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(reception)" as any);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [router]);

  const handleCall = (phone: string) => {
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (!clean) return Alert.alert("No Phone", "No valid phone number.");
    Linking.openURL(`tel:${clean}`);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (!clean) return Alert.alert("No Phone", "No valid phone number.");
    const msg = `Hello ${name}, greetings from Spiritual Homeopathy Clinic!`;
    Linking.openURL(`https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`);
  };

  const handleHistoryRx = (patient: any) => {
    const regId = patient.regId || patient.registrationId || "";
    const name = encodeURIComponent(patient.name || patient.patientName || "");
    const phone = encodeURIComponent((patient.phone || "").replace(/\D/g, "").slice(-10));
    const branch = encodeURIComponent(patient.branch || activeBranch?.name || "");
    router.push(`/(reception)/patient-history?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
  };

  const renderPatientCard = ({ item }: { item: any }) => {
    const name = item.name || item.patientName || "Unknown";
    const regId = item.regId || item.registrationId || "ID: N/A";
    const phone = item.phone || item.phoneNumber || "";
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const displayPhone = cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "No Mobile";
    const totalVisits = item.totalVisits || item.appointmentCount || 0;
    const lastVisit = item.lastVisitDate || item.lastVisit || "";
    const doctor = item.doctorName || item.lastDoctorName || "";
    const branch = item.branch || (activeBranch?.name ?? "");
    const diseases = item.diseases || item.primarySymptoms || "";
    const status = (item.status || "").toUpperCase();
    const isInDuration = status === "IN_CONSULTATION" || status === "COLLECT_FEE" || status === "WAITING" || status === "SCHEDULED";

    // Format last visit date
    let lastVisitLabel = "";
    if (lastVisit) {
      try {
        const clean = normalizeDateStr(lastVisit);
        const parts = clean.split("-");
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const dateObj = new Date(y, m, d);
          if (!isNaN(dateObj.getTime())) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            if (dateObj.toDateString() === today.toDateString()) lastVisitLabel = "Today";
            else if (dateObj.toDateString() === yesterday.toDateString()) lastVisitLabel = "Yesterday";
            else {
              lastVisitLabel = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            }
          } else {
            lastVisitLabel = lastVisit;
          }
        } else {
          lastVisitLabel = lastVisit;
        }
      } catch {
        lastVisitLabel = lastVisit;
      }
    }

    return (
      <View style={styles.card}>
        {/* Top Row: Name + Status badge */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={styles.patientName} numberOfLines={1}>{name}</Text>
              {isInDuration && (
                <View style={styles.inDurBadge}>
                  <Ionicons name="pulse" size={9} color="#b45309" />
                  <Text style={styles.inDurBadgeText}>IN-DUR</Text>
                </View>
              )}
            </View>
            <Text style={styles.regIdText}>ID: {regId}</Text>
          </View>
          {/* Visits badge - removed 0 visited */}
          {totalVisits > 0 && (
            <View style={styles.visitsBadge}>
              <Ionicons name="repeat" size={11} color="#0284c7" />
              <Text style={styles.visitsText}>{totalVisits} {totalVisits === 1 ? "Visit" : "Visits"}</Text>
            </View>
          )}
        </View>

        {/* Branch & Date */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.infoText}>{branch}</Text>
          {lastVisitLabel ? (
            <>
              <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
              <Text style={styles.infoText}>{lastVisitLabel}</Text>
            </>
          ) : null}
        </View>

        {/* Doctor */}
        {doctor ? (
          <View style={styles.infoRow}>
            <Ionicons name="fitness-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{doctor.startsWith("Dr.") ? doctor : `Dr. ${doctor}`}</Text>
          </View>
        ) : null}

        {/* Phone + Action Buttons */}
        <View style={styles.cardBottomRow}>
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={13} color={COLORS.primary} />
            <Text style={styles.phoneText}>{displayPhone}</Text>
          </View>
          <View style={styles.actionBtns}>
            {/* History & Rx */}
            <TouchableOpacity style={styles.historyBtn} onPress={() => handleHistoryRx(item)} activeOpacity={0.7}>
              <Text style={styles.historyBtnText}>History & Rx</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={44} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>No Patients Found</Text>
      <Text style={styles.emptySubtext}>
        {search.trim()
          ? `No patients match "${search}".`
          : session === "TODAY"
          ? "No patients registered today."
          : session === "YESTERDAY"
          ? "No patients registered yesterday."
          : "No patients registered for this branch yet."}
      </Text>
    </View>
  );

  const branchName = activeBranch?.name || activeBranch?.branch || "Branch";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Patients Directory</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{branchName}</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} activeOpacity={0.7} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Patient Name, Phone (+91), or ID..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Session Tabs */}
      <View style={styles.tabsRow}>
        {(["TODAY", "YESTERDAY", "ALL"] as SessionTab[]).map((tab) => {
          const label = tab === "ALL" ? `All Patients (${sessionCounts.ALL})` : `${tab === "TODAY" ? "Today" : "Yesterday"} (${sessionCounts[tab]})`;
          const isActive = session === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => handleTabChange(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Patient List */}
      {isLoading && patients.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item, idx) => item.regId || item.registrationId || String(idx)}
          renderItem={renderPatientCard}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
                  onPress={handlePrevPage}
                  disabled={currentPage <= 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color={currentPage <= 1 ? "#94a3b8" : COLORS.primary} />
                  <Text style={[styles.pageBtnText, currentPage <= 1 && { color: "#94a3b8" }]}>Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Page {currentPage} of {totalPages}{"  "}
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>({totalCount} total)</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
                  onPress={handleNextPage}
                  disabled={currentPage >= totalPages}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pageBtnText, currentPage >= totalPages && { color: "#94a3b8" }]}>Next</Text>
                  <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages ? "#94a3b8" : COLORS.primary} />
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
      )}

      {/* Fixed Bottom Navigation Bar */}
      <ReceptionBottomNav activeTab="patient-list" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f6fc",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f6fc",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textDark },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.white },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  loadingText: { marginTop: 10, fontSize: 12, color: COLORS.textMuted },
  listContent: { padding: 14, paddingBottom: 85 },
  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 12 },
  emptySubtext: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 4, maxWidth: 240 },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  patientName: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, flex: 1 },
  regIdText: { fontSize: 11, fontWeight: "700", color: COLORS.primary, marginTop: 1 },
  inDurBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inDurBadgeText: { fontSize: 9, fontWeight: "800", color: "#b45309" },
  visitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  visitsText: { fontSize: 10.5, fontWeight: "700", color: COLORS.primary },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  infoText: { fontSize: 11, color: COLORS.textMuted },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  phoneText: { fontSize: 12, fontWeight: "600", color: COLORS.textDark },
  actionBtns: { flexDirection: "row", alignItems: "center", gap: 7 },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyBtnText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pageBtnDisabled: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  pageBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  pageInfo: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
});
