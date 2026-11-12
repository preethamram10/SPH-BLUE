import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { DoctorDrawerSidebar } from "../../../components/doctor/DoctorDrawerSidebar";
import { DoctorHeader } from "../../../components/doctor/DoctorHeader";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

const PAGE_SIZE = 25;
type SessionTab = "TODAY" | "YESTERDAY" | "ALL";

const COLORS = {
  primary: "#0284c7",
  card: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  success: "#16a34a",
  warning: "#d97706",
};

export default function DoctorPatientListScreen() {
  const router = useRouter();

  const [patients, setPatients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [session, setSession] = useState<SessionTab>("TODAY");
  const [sessionCounts, setSessionCounts] = useState<Record<SessionTab, number>>({ TODAY: 0, YESTERDAY: 0, ALL: 0 });
  const [activeBranch, setActiveBranch] = useState<any>(null);

  useEffect(() => {
    getActiveBranch().then((b) => { if (b) setActiveBranch(b); });
  }, []);

  const fetchPatients = useCallback(
    async (tab: SessionTab, page: number, isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const branchName = activeBranch?.name || activeBranch?.branch || "";
        const doctorName = activeBranch?.doctorName || activeBranch?.doctorId || "";
        const params = new URLSearchParams({
          session: tab,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (branchName) params.set("branch", branchName);
        if (doctorName) params.set("doctorName", doctorName);

        const data = await apiFetch<any>(`/doctor/patients?${params.toString()}`);
        if (data.success) {
          setPatients(data.patients || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(data.currentPage || 1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeBranch]
  );

  const fetchSessionCounts = useCallback(async () => {
    const branchName = activeBranch?.name || activeBranch?.branch || "";
    const doctorName = activeBranch?.doctorName || activeBranch?.doctorId || "";
    const tabs: SessionTab[] = ["TODAY", "YESTERDAY", "ALL"];
    const counts: Record<SessionTab, number> = { TODAY: 0, YESTERDAY: 0, ALL: 0 };
    await Promise.all(
      tabs.map(async (tab) => {
        try {
          const params = new URLSearchParams({ session: tab, page: "1", pageSize: "1" });
          if (branchName) params.set("branch", branchName);
          if (doctorName) params.set("doctorName", doctorName);
          const data = await apiFetch<any>(`/doctor/patients?${params.toString()}`);
          if (data.success) counts[tab] = data.totalCount || 0;
        } catch {}
      })
    );
    setSessionCounts(counts);
  }, [activeBranch]);

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

  const onPullRefresh = () => fetchPatients(session, currentPage, true);

  const handlePrevPage = () => {
    if (currentPage > 1) fetchPatients(session, currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) fetchPatients(session, currentPage + 1);
  };

  const handleWhatsApp = (phone?: string, patientName?: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) { Alert.alert("No Phone", "No valid phone number."); return; }
    const msg = `Hello ${patientName || "Patient"}, this is regarding your homeopathic consultation follow-up with Spiritual Homeopathy.`;
    Linking.openURL(`https://wa.me/91${clean}?text=${encodeURIComponent(msg)}`);
  };

  const handleCall = (phone?: string) => {
    const clean = (phone || "").replace(/\D/g, "").slice(-10);
    if (!clean) { Alert.alert("No Phone", "No valid phone number."); return; }
    Linking.openURL(`tel:${clean}`);
  };

  const handleHistoryRx = (patient: any) => {
    const regId = patient.id || patient.registrationId || "";
    const name = encodeURIComponent(patient.name || patient.patientName || "");
    const phone = encodeURIComponent((patient.phone || "").replace(/\D/g, "").slice(-10));
    const branch = encodeURIComponent(patient.branch || activeBranch?.name || "");
    router.push(`/(doctor)/patient-history?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(doctor)");
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { handleBack(); return true; });
    return () => sub.remove();
  }, [router]);

  const filteredPatients = searchTerm.trim()
    ? patients.filter((p) => {
        const q = searchTerm.toLowerCase();
        return (
          (p.name || p.patientName || "").toLowerCase().includes(q) ||
          (p.phone || "").includes(q) ||
          (p.id || p.registrationId || "").toLowerCase().includes(q) ||
          (p.diseases || p.primarySymptoms || "").toLowerCase().includes(q)
        );
      })
    : patients;

  const renderCard = ({ item: p, index: idx }: { item: any; index: number }) => {
    const name = p.name || p.patientName || "Unknown";
    const regId = p.id || p.registrationId || "SPH-GEN";
    const phone = p.phone || "";
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const displayPhone = cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "N/A";
    const totalVisits = p.totalVisits || p.appointmentCount || 0;
    const lastVisit = p.lastVisitDate || p.lastVisit || "";
    const diseases = p.diseases || p.primarySymptoms || "";

    let lastVisitLabel = "";
    if (lastVisit) {
      try {
        let cleanDt = String(lastVisit).trim().split("T")[0].replace(/\//g, "-");
        const parts = cleanDt.split("-");
        if (parts.length === 3) {
          let y = parseInt(parts[0], 10);
          if (y < 100) cleanDt = `${2000 + y}-${parts[1]}-${parts[2]}`;
          else if (parseInt(parts[2], 10) < 100 && parts[0].length <= 2) {
            cleanDt = `${parts[0]}-${parts[1]}-${2000 + parseInt(parts[2], 10)}`;
          }
        }
        const d = new Date(cleanDt);
        if (!isNaN(d.getTime()) && d.getFullYear() < 100) {
          d.setFullYear(2000 + d.getFullYear());
        }
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (!isNaN(d.getTime())) {
          if (d.toDateString() === today.toDateString()) lastVisitLabel = "Today";
          else if (d.toDateString() === yesterday.toDateString()) lastVisitLabel = "Yesterday";
          else lastVisitLabel = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        } else {
          lastVisitLabel = lastVisit;
        }
      } catch { lastVisitLabel = lastVisit; }
    }

    return (
      <View style={styles.patientCard}>
        {/* Top Row: Avatar + Name + Visits */}
        <View style={styles.cardTopRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{(name).slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.patientName} numberOfLines={1}>{name}</Text>
              {totalVisits > 0 && (
                <View style={styles.visitsBadge}>
                  <Ionicons name="repeat" size={11} color="#0284c7" />
                  <Text style={styles.visitsText}>{totalVisits} {totalVisits === 1 ? "Visit" : "Visits"}</Text>
                </View>
              )}
            </View>
            <Text style={styles.metaText}>
              ID: {regId} • {displayPhone}
            </Text>
          </View>
        </View>

        {/* Symptoms / Chief Complaints */}
        {diseases ? (
          <View style={styles.symptomsBox}>
            <Ionicons name="pulse" size={12} color="#0284c7" />
            <Text style={styles.symptomsText} numberOfLines={2}>Chief Complaints: {diseases}</Text>
          </View>
        ) : null}

        {/* Last Visit Date */}
        {lastVisitLabel ? (
          <View style={styles.lastVisitRow}>
            <Ionicons name="calendar-outline" size={12} color="#64748b" />
            <Text style={styles.lastVisitText}>Last Visit: {lastVisitLabel}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity style={styles.historyBtn} onPress={() => handleHistoryRx(p)} activeOpacity={0.7}>
            <Text style={styles.historyBtnText}>History & Rx</Text>
            <Ionicons name="chevron-forward" size={12} color="#0284c7" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DoctorHeader title="All Patients" onBack={handleBack} />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchHeader}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name, phone, or ID..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Session Tabs */}
          <View style={styles.tabsRow}>
            {(["TODAY", "YESTERDAY", "ALL"] as SessionTab[]).map((tab) => {
              const count = sessionCounts[tab];
              const label = tab === "ALL" ? `All Patients (${count})` : `${tab === "TODAY" ? "Today" : "Yesterday"} (${count})`;
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

          {/* Summary row */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryLeft}>
              <Ionicons name="people" size={14} color="#0284c7" />
              <Text style={styles.summaryText}>
                Showing <Text style={{ fontWeight: "700", color: "#0f172a" }}>{filteredPatients.length}</Text>
                {" "}of {totalCount} patients
              </Text>
            </View>
            <View style={styles.consultedBadge}>
              <Text style={styles.consultedBadgeText}>Consulted Records</Text>
            </View>
          </View>
        </View>

        {isLoading && patients.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patient records...</Text>
          </View>
        ) : (
          <FlatList
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            data={filteredPatients}
            keyExtractor={(item, idx) => item.id || item.registrationId || String(idx)}
            renderItem={renderCard}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onPullRefresh} colors={[COLORS.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="person-remove-outline" size={44} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Patients Found</Text>
                <Text style={styles.emptySubtext}>
                  {searchTerm
                    ? `No patient records match "${searchTerm}".`
                    : session === "TODAY"
                    ? "No patients consulted today."
                    : session === "YESTERDAY"
                    ? "No patients consulted yesterday."
                    : "No consulted patients registered under your profile yet."}
                </Text>
              </View>
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
      </View>

      <DoctorBottomNav activeTab="patient-list" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  searchHeader: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#0f172a" },
  tabsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  tabBtnActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  tabBtnText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  tabBtnTextActive: { color: "#ffffff" },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  summaryText: { fontSize: 11, color: "#64748b" },
  consultedBadge: { backgroundColor: "#e0f2fe", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  consultedBadgeText: { fontSize: 10, fontWeight: "700", color: "#0284c7" },
  scrollList: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 24 },
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 12, color: "#64748b" },
  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginTop: 12 },
  emptySubtext: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 4, maxWidth: 240 },
  patientCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 14, fontWeight: "700", color: "#0284c7" },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 14, fontWeight: "700", color: "#0f172a", flex: 1 },
  visitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visitsText: { fontSize: 10.5, fontWeight: "700", color: "#0284c7" },
  metaText: { fontSize: 11, color: "#64748b", marginTop: 2 },
  symptomsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  symptomsText: { fontSize: 11, color: "#334155", flex: 1 },
  lastVisitRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  lastVisitText: { fontSize: 11, color: "#64748b" },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    alignItems: "center",
  },
  historyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingVertical: 7,
    borderRadius: 8,
  },
  historyBtnText: { fontSize: 12, fontWeight: "700", color: "#0284c7" },
  iconActionBtn: {
    width: 34,
    height: 34,
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
  pageBtnText: { fontSize: 13, fontWeight: "700", color: "#0284c7" },
  pageInfo: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
});
