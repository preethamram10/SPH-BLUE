import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";

const OUTCOME_FILTERS = ["All", "Interested", "Callback Requested", "Not Interested", "No Response"];
const PAGE_SIZE = 25;

export default function MobileTelecallerUpdatesScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/telecaller/call-logs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.warn("Failed fetching mobile call logs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, outcomeFilter]);

  const handleDial = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`tel:${clean}`);
  };

  const getOutcomeStyle = (outcome: string) => {
    const o = (outcome || "").toLowerCase();
    if (o.includes("interested") && !o.includes("not")) {
      return { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" };
    }
    if (o.includes("callback")) {
      return { bg: "#f0f9ff", border: "#bae6fd", text: "#0284c7" };
    }
    if (o.includes("not")) {
      return { bg: "#fef2f2", border: "#fecaca", text: "#ef4444" };
    }
    return { bg: "#f1f5f9", border: "#e2e8f0", text: "#64748b" };
  };

  // Filtered and sorted newest first
  const sortedAndFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = logs.filter((item) => {
      const matchesSearch =
        !q ||
        (item.patientName || "").toLowerCase().includes(q) ||
        (item.agentName || "").toLowerCase().includes(q) ||
        (item.telecallerId || "").toLowerCase().includes(q) ||
        (item.phone || "").includes(q) ||
        (item.notes || "").toLowerCase().includes(q) ||
        (item.branch || "").toLowerCase().includes(q);

      const matchesOutcome =
        outcomeFilter === "All" ||
        (item.callOutcome || "").toLowerCase() === outcomeFilter.toLowerCase();

      return matchesSearch && matchesOutcome;
    });

    return filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.dateTime).getTime() || 0;
      const timeB = new Date(b.createdAt || b.dateTime).getTime() || 0;
      return timeB - timeA;
    });
  }, [logs, search, outcomeFilter]);

  const totalEntries = sortedAndFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFiltered.slice(start, start + PAGE_SIZE);
  }, [sortedAndFiltered, currentPage]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Telecaller Updates</Text>
          <Text style={styles.headerSub}>Live Outbound Call Stream (25 / page)</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchLogs}>
          <Ionicons name="refresh" size={18} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search caller, patient, phone or note..."
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

      {/* Filter Horizontal Strip */}
      <View style={styles.filterStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {OUTCOME_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                outcomeFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setOutcomeFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  outcomeFilter === f && styles.filterChipTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stream List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284c7"]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : paginatedLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="call-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No call logs found</Text>
            <Text style={styles.emptySub}>Call updates submitted by telecallers will appear here in real time</Text>
          </View>
        ) : (
          paginatedLogs.map((u) => {
            const badge = getOutcomeStyle(u.callOutcome);
            return (
              <View key={u.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patient}>{u.patientName}</Text>
                    <TouchableOpacity
                      style={styles.phoneRow}
                      onPress={() => handleDial(u.phone)}
                    >
                      <Ionicons name="call" size={12} color="#0284c7" />
                      <Text style={styles.phoneText}>{u.phone}</Text>
                      <Text style={styles.tapToDial}>• Tap to call</Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: badge.bg, borderColor: badge.border },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {u.callOutcome || "Interested"}
                    </Text>
                  </View>
                </View>

                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{u.notes || "No notes logged."}</Text>
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.callerBadge}>
                    <Ionicons name="person" size={11} color="#64748b" />
                    <Text style={styles.callerText}>
                      {u.agentName} {u.telecallerId ? `(${u.telecallerId})` : ""}
                    </Text>
                  </View>
                  <View style={styles.branchBadge}>
                    <Ionicons name="business" size={11} color="#64748b" />
                    <Text style={styles.branchText}>{u.branch}</Text>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={11} color="#94a3b8" />
                  <Text style={styles.timeText}>{u.dateTime}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Pagination Controls Bar (25 per page) */}
      {totalEntries > 0 && (
        <View style={styles.paginationBar}>
          <TouchableOpacity
            disabled={currentPage <= 1}
            style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage <= 1 ? "#cbd5e1" : "#0284c7"} />
            <Text style={[styles.pageBtnText, currentPage <= 1 && styles.pageBtnTextDisabled]}>Prev</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfoText}>
            Page {currentPage} of {totalPages} ({totalEntries} total)
          </Text>

          <TouchableOpacity
            disabled={currentPage >= totalPages}
            style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <Text style={[styles.pageBtnText, currentPage >= totalPages && styles.pageBtnTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages ? "#cbd5e1" : "#0284c7"} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  refreshBtn: { padding: 8, backgroundColor: "#f0f9ff", borderRadius: 8 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  filterStrip: { paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  filterChipText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  filterChipTextActive: { color: "#ffffff" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  patient: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  phoneText: { fontSize: 12, color: "#0284c7", fontWeight: "700" },
  tapToDial: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10.5, fontWeight: "800" },
  notesBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  notesText: { fontSize: 12, color: "#334155", lineHeight: 17, fontWeight: "500" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  callerBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  callerText: { fontSize: 11, color: "#475569", fontWeight: "700" },
  branchBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  branchText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  timeText: { fontSize: 10.5, color: "#94a3b8", fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 4 },
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },
  pageBtnDisabled: {
    backgroundColor: "#f8fafc",
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284c7",
  },
  pageBtnTextDisabled: {
    color: "#cbd5e1",
  },
  pageInfoText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748b",
  },
});
