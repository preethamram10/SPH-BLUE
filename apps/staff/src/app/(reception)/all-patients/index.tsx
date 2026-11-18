import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  BackHandler,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveBranch } from "../../../services/auth";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";
import { saveActiveRoute, saveFilters, getFilters } from "../../../services/appSession";
import { PatientCard } from "../../../components/reception/PatientCard";
import {
  useReceptionPatients,
  usePatientSessionCounts,
} from "../../../hooks/useReceptionPatients";

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
  const queryClient = useQueryClient();

  // Search & Session Tab State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [session, setSession] = useState<SessionTab>("TODAY");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeBranch, setActiveBranch] = useState<any>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load branch & saved filters on mount
  useEffect(() => {
    saveActiveRoute("/(reception)/all-patients");
    getFilters<any>("all_patients").then((f) => {
      if (f) {
        if (f.search !== undefined) {
          setSearch(f.search);
          setDebouncedSearch(f.search);
        }
        if (f.session) setSession(f.session);
      }
    });

    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  useEffect(() => {
    saveFilters("all_patients", { search, session });
  }, [search, session]);

  const branchName = activeBranch?.name || activeBranch?.branch || "";

  // 1. Ultra-fast session counts summary (< 5ms on backend)
  const {
    data: sessionCounts,
    isLoading: isLoadingCounts,
    refetch: refetchCounts,
  } = usePatientSessionCounts(branchName);

  // 2. High-performance cached patients query (per [branch, session, page, search])
  const {
    data: patientsData,
    isLoading: isLoadingPatients,
    isFetching: isFetchingPatients,
    refetch: refetchPatients,
  } = useReceptionPatients({
    branch: branchName,
    session,
    page: currentPage,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
  });

  const patients = patientsData?.patients || [];
  const totalCount = patientsData?.totalCount || 0;
  const totalPages = patientsData?.totalPages || 1;

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchPatients(), refetchCounts()]);
  }, [refetchPatients, refetchCounts]);

  // Tab change
  const handleTabChange = useCallback((tab: SessionTab) => {
    setSession(tab);
    setCurrentPage(1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.navigate("/(reception)" as any);
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const handleHistoryRx = useCallback(
    (patient: any) => {
      const regId = patient.regId || patient.registrationId || "";
      const name = encodeURIComponent(patient.name || patient.patientName || "");
      const phone = encodeURIComponent((patient.phone || "").replace(/\D/g, "").slice(-10));
      const branch = encodeURIComponent(patient.branch || branchName || "");
      router.push(`/(reception)/patient-history?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
    },
    [branchName, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <PatientCard
        item={item}
        branchName={branchName}
        onHistoryRx={handleHistoryRx}
      />
    ),
    [branchName, handleHistoryRx]
  );

  const keyExtractor = useCallback(
    (item: any, idx: number) => item.regId || item.registrationId || String(idx),
    []
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={44} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>No Patients Found</Text>
        <Text style={styles.emptySubtext}>
          {debouncedSearch.trim()
            ? `No patients match "${debouncedSearch}".`
            : session === "TODAY"
              ? "No patients registered today."
              : session === "YESTERDAY"
                ? "No patients registered yesterday."
                : "No patients registered for this branch yet."}
        </Text>
      </View>
    ),
    [debouncedSearch, session]
  );

  const renderFooter = useCallback(() => {
    if (totalPages <= 1) return null;
    return (
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
    );
  }, [totalPages, currentPage, totalCount, handlePrevPage, handleNextPage]);

  // Loading state (only shown on the first uncached load, never when cached)
  const isInitialLoading = isLoadingPatients && patients.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Patients Directory</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{branchName || "Branch"}</Text>
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

      {/* Session Tabs with fast counts */}
      <View style={styles.tabsRow}>
        {(["TODAY", "YESTERDAY", "ALL"] as SessionTab[]).map((tab) => {
          let countVal: number | undefined = undefined;
          if (sessionCounts && typeof sessionCounts[tab] === "number") {
            countVal = sessionCounts[tab];
          } else if (session === tab && typeof patientsData?.totalCount === "number") {
            countVal = patientsData.totalCount;
          }

          const countDisplay = countVal !== undefined ? countVal : "–";
          const label =
            tab === "ALL"
              ? `All Patients (${countDisplay})`
              : `${tab === "TODAY" ? "Today" : "Yesterday"} (${countDisplay})`;
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
      {isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={isFetchingPatients && !isInitialLoading}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListFooterComponent={renderFooter}
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
