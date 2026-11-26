import React, { useState, useEffect, useCallback } from "react";
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
import { getActiveBranch } from "../../../services/auth";
import { DoctorHeader } from "../../../components/doctor/DoctorHeader";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";
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
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

export default function DoctorPatientListScreen() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [session, setSession] = useState<SessionTab>("TODAY");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeBranch, setActiveBranch] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  const branchName = activeBranch?.name || activeBranch?.branch || "";

  const {
    data: sessionCounts,
    refetch: refetchCounts,
  } = usePatientSessionCounts(branchName);

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

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchPatients(), refetchCounts()]);
  }, [refetchPatients, refetchCounts]);

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
    else router.navigate("/(doctor)" as any);
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
      const phone = encodeURIComponent((patient.phone || patient.phoneNumber || "").replace(/\D/g, "").slice(-10));
      const branch = encodeURIComponent(patient.branch || branchName || "");
      router.push(`/(doctor)/patient-history?id=${regId}&name=${name}&phone=${phone}&branch=${branch}` as any);
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

  const isInitialLoading = isLoadingPatients && patients.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <DoctorHeader title="All Patients Directory" onBack={handleBack} />

      <View style={styles.container}>
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
      </View>

      <DoctorBottomNav activeTab="patient-list" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textDark,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  tabBtnTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  emptySubtext: {
    fontSize: 12.5,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageBtnDisabled: {
    backgroundColor: "#f1f5f9",
  },
  pageBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  pageInfo: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
});
